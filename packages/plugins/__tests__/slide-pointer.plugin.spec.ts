// @vitest-environment jsdom

/**
 * TSlidePointerPlugin — нажатие, протяжка и отпускание указателя.
 *
 * Разметку тест строит сам — корень, дорожка и ручки с полями, как их рисует
 * Vue, — а плагины собраны настоящим набором. Коробку дорожки задаёт тест:
 * jsdom раскладку не считает. Захвата указателя в jsdom нет, поэтому события
 * тест шлёт прямо в корень; настоящий ввод — `playground/vue/browser/slider.spec.ts`.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { TClasses, TSlider } from '@soldy-ui/core'
import type { ISlidable, ISliderProps, TSlideEdge, TSlideOrientation } from '@soldy-ui/core'
import { TElementPlugin, TPluginBundle, TSlidePointerPlugin } from '../src'
import type { IPlugin, IPluginConstructor } from '../src'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/** Плагин, который тест поставил сам: без него дальше проверять нечего. */
function pluginOf<P extends IPlugin<any, any>>(
	bundle: TPluginBundle,
	ctor: IPluginConstructor<any, any, P>,
): P {
	const plugin = bundle.get(ctor)

	if (!plugin) throw new Error(`${ctor.name} не установлен в bundle`)

	return plugin
}

const bundles: TPluginBundle[] = []

afterEach(() => {
	for (const bundle of bundles.splice(0)) bundle.destroy()

	document.body.innerHTML = ''
})

/** Дорожка: 200 px по ширине и высоте, левый верхний угол — (100, 100). */
const TRACK = new DOMRect(100, 100, 200, 200)

/**
 * Ползунок на странице: корень, дорожка и по ручке с полем на значение.
 * `owner` — владелец перетаскивания; по умолчанию настоящий `TSlider`.
 */
async function mount<T extends ISlidable>(owner: T, dir: 'ltr' | 'rtl' = 'ltr') {
	const bundle = new TPluginBundle(owner).use(TElementPlugin).use(TSlidePointerPlugin)

	bundles.push(bundle)

	const root = document.createElement('span')
	const track = document.createElement('span')

	root.dir = dir
	root.className = owner.classes.base
	track.className = owner.classes.resolve('__track')
	root.append(track)

	const fields = owner.values.map(() => {
		const thumb = document.createElement('span')
		const field = document.createElement('input')

		thumb.className = owner.classes.resolve('__thumb')
		field.type = 'range'
		thumb.append(field)
		track.append(thumb)

		return field
	})

	document.body.append(root)
	vi.spyOn(track, 'getBoundingClientRect').mockReturnValue(TRACK)

	pluginOf(bundle, TElementPlugin).element = root
	await nextFrame()

	const thumbs = [...track.children].filter((node) =>
		node.classList.contains(owner.classes.resolve('__thumb')),
	)

	/** Указатель: событие с точкой, всплывает до корня. Отдаёт событие — по нему видно, погашено ли. */
	const pointer = (
		type: string,
		target: Element,
		x: number,
		y = 150,
		init: PointerEventInit = {},
	): PointerEvent => {
		const event = new PointerEvent(type, {
			bubbles: true,
			cancelable: true,
			clientX: x,
			clientY: y,
			pointerId: 1,
			button: 0,
			...init,
		})

		target.dispatchEvent(event)

		return event
	}

	/** `click` по корню — тот, что браузер шлёт за отпусканием. `false` — погашен. */
	const click = () =>
		root.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

	return { owner, bundle, root, track, thumbs, fields, pointer, click }
}

const slider = (props: Partial<ISliderProps> = {}) => new TSlider(props)

describe('нажатие мимо ручек', () => {
	it('ставит ближайшую ручку в точку нажатия, гасится, фокус — её полю', async () => {
		const { owner, track, fields, pointer } = await mount(slider({ value: [20, 80] }))

		const down = pointer('pointerdown', track, 180)

		expect(owner.value).toEqual([40, 80])
		expect(down.defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(fields[0])
	})

	it('доля — по коробке дорожки: за её краем — край хода', async () => {
		const { owner, root, pointer } = await mount(slider({ value: 50 }))

		pointer('pointerdown', root, 40)

		expect(owner.value).toBe(0)
	})

	it('RTL: ход растёт справа налево', async () => {
		const { owner, track, pointer } = await mount(slider({ value: 50 }), 'rtl')

		pointer('pointerdown', track, 150)

		expect(owner.value).toBe(75)
	})

	it('inverted: ход растёт в обратную сторону', async () => {
		const { owner, track, pointer } = await mount(slider({ value: 50, inverted: true }))

		pointer('pointerdown', track, 150)

		expect(owner.value).toBe(75)
	})

	it('вертикальный: ход растёт снизу вверх, по y', async () => {
		const { owner, track, pointer } = await mount(
			slider({ value: 50, orientation: 'vertical' }),
		)

		pointer('pointerdown', track, 900, 150)

		expect(owner.value).toBe(75)
	})
})

describe('протяжка', () => {
	it('нажатие на ручке значение не меняет; ручка идёт за указателем со смещением захвата', async () => {
		const { owner, thumbs, root, fields, pointer } = await mount(slider({ value: 50 }))

		// Центр ручки — 200 px; взялись на 4 px правее
		pointer('pointerdown', thumbs[0], 204)
		expect(owner.value).toBe(50)
		expect(document.activeElement).toBe(fields[0])

		pointer('pointermove', root, 224)
		expect(owner.value).toBe(60)
		expect(owner.dragging).toBe(true)
	})

	it('чужой указатель жест не двигает', async () => {
		const { owner, track, root, pointer } = await mount(slider({ value: 50 }))

		pointer('pointerdown', track, 200)
		pointer('pointermove', root, 280, 150, { pointerId: 2 })

		expect(owner.value).toBe(50)
		expect(owner.dragging).toBe(false)
	})

	it('второй указатель во время жеста его не перехватывает', async () => {
		const { owner, track, pointer } = await mount(slider({ value: [20, 80] }))

		pointer('pointerdown', track, 140)
		const second = pointer('pointerdown', track, 280, 150, { pointerId: 2 })

		expect(owner.value).toEqual([20, 80])
		expect(second.defaultPrevented).toBe(false)
	})

	it('фокус переходит к ручке, которую выбрало первое движение', async () => {
		const { owner, thumbs, root, fields, pointer } = await mount(slider({ value: [50, 50] }))

		// Сверху лежит вторая ручка — нажатие приходит ей
		pointer('pointerdown', thumbs[1], 200)
		expect(document.activeElement).toBe(fields[1])

		pointer('pointermove', root, 160)

		expect(owner.value).toEqual([30, 50])
		expect(document.activeElement).toBe(fields[0])
	})

	it('отпускание заканчивает жест: dragging снят, commit — один', async () => {
		const { owner, track, root, pointer } = await mount(slider({ value: 50 }))
		const commit = vi.fn()

		owner.events.on('commit', commit)

		pointer('pointerdown', track, 200)
		pointer('pointermove', root, 240)
		pointer('pointermove', root, 260)
		pointer('pointerup', root, 260)
		pointer('pointermove', root, 300)

		expect(owner.value).toBe(80)
		expect(owner.dragging).toBe(false)
		expect(commit).toHaveBeenCalledOnce()
		expect(commit).toHaveBeenCalledWith({ newValue: 80, oldValue: 50 })
	})

	it('браузер отнял указатель — жест закончен', async () => {
		const { owner, track, root, pointer } = await mount(slider({ value: 50 }))

		pointer('pointerdown', track, 200)
		pointer('pointermove', root, 240)
		pointer('pointercancel', root, 240)

		expect(owner.dragging).toBe(false)
		expect(owner.activeThumb).toBeUndefined()
	})

	it('корень ушёл посреди жеста — жест закончен', async () => {
		const { owner, bundle, track, root, pointer } = await mount(slider({ value: 50 }))

		pointer('pointerdown', track, 200)
		pointer('pointermove', root, 240)

		pluginOf(bundle, TElementPlugin).element = null

		expect(owner.dragging).toBe(false)
		expect(owner.activeThumb).toBeUndefined()
	})
})

describe('click, которым кончился жест', () => {
	/**
	 * Внутри подписи `Label` этот `click` запустил бы её действие — фокус на
	 * первое поле, даже если тянули вторую ручку.
	 */
	it('гасится один раз: следующий click — пользователя', async () => {
		const { track, root, pointer, click } = await mount(slider({ value: 50 }))

		pointer('pointerdown', track, 200)
		pointer('pointerup', root, 200)

		expect(click()).toBe(false)
		expect(click()).toBe(true)
	})

	it('за отнятым указателем click не приходит — и не ждётся', async () => {
		const { track, root, pointer, click } = await mount(slider({ value: 50 }))

		pointer('pointerdown', track, 200)
		pointer('pointercancel', root, 200)

		expect(click()).toBe(true)
	})
})

describe('что нажатием не считается', () => {
	it('не основная кнопка', async () => {
		const { owner, track, pointer } = await mount(slider({ value: 50 }))

		const down = pointer('pointerdown', track, 120, 150, { button: 2 })

		expect(owner.value).toBe(50)
		expect(down.defaultPrevented).toBe(false)
	})

	it('выключенный владелец жест не начинает: нажатие не гасится', async () => {
		const { owner, track, root, pointer } = await mount(slider({ value: 50, disabled: true }))

		const down = pointer('pointerdown', track, 120)
		pointer('pointermove', root, 150)

		expect(owner.value).toBe(50)
		expect(down.defaultPrevented).toBe(false)
		expect(document.activeElement).toBe(document.body)
	})
})

/**
 * Плагин говорит с владельцем только через контракт `ISlidable`: ползунок ему
 * не нужен. Так его возьмёт следующий компонент с перетаскиванием.
 */
describe('владелец — любой ISlidable', () => {
	class TProbe implements ISlidable {
		readonly classes = new TClasses('s-probe')
		readonly orientation: TSlideOrientation = 'horizontal'
		readonly inverted = false
		readonly largeStep = 10
		readonly values = [10, 90]
		activeThumb: number | undefined = undefined
		readonly calls: unknown[][] = []

		grab(index: number, fraction: number): boolean {
			this.calls.push(['grab', index, fraction])
			this.activeThumb = index

			return true
		}

		press(fraction: number): boolean {
			this.calls.push(['press', fraction])
			this.activeThumb = 0

			return true
		}

		drag(fraction: number): void {
			this.calls.push(['drag', fraction])
		}

		release(): void {
			this.calls.push(['release'])
			this.activeThumb = undefined
		}

		shift(index: number, count: number): void {
			this.calls.push(['shift', index, count])
		}

		moveToEdge(index: number, edge: TSlideEdge): void {
			this.calls.push(['moveToEdge', index, edge])
		}
	}

	it('части — по классам владельца, доли — в направлении роста', async () => {
		const { owner, thumbs, track, root, pointer } = await mount(new TProbe())

		pointer('pointerdown', thumbs[1], 250)
		pointer('pointermove', root, 150)
		pointer('pointerup', root, 150)
		pointer('pointerdown', track, 350)

		expect(owner.calls).toEqual([['grab', 1, 0.75], ['drag', 0.25], ['release'], ['press', 1]])
	})
})
