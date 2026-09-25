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
import { TClasses, TEvented, TSlider } from '@soldy-ui/core'
import type {
	ISlidable,
	ISliderProps,
	TSlideEdge,
	TSlideOrientation,
	TSlideSnap,
} from '@soldy-ui/core'
import { TElementPlugin, TPluginBundle, TSlidePointerPlugin } from '../src'
import type { IPlugin, IPluginConstructor, ISlidePointerPluginOptions } from '../src'

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
	vi.useRealTimers()
})

/** Дорожка: 200 px по ширине и высоте, левый верхний угол — (100, 100). */
const TRACK = new DOMRect(100, 100, 200, 200)

/**
 * Ползунок на странице: корень, дорожка и по ручке с полем на значение.
 * `owner` — владелец перетаскивания; по умолчанию настоящий `TSlider`.
 */
async function mount<T extends ISlidable>(
	owner: T,
	dir: 'ltr' | 'rtl' = 'ltr',
	options: ISlidePointerPluginOptions = {},
) {
	const bundle = new TPluginBundle(owner).use(TElementPlugin).use(TSlidePointerPlugin, options)

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

	/**
	 * Взялись за ручку на 4 px ближе к краю, к которому тянут. Ядро прибавляет к
	 * доле указателя смещение захвата, и доля, прижатая к краю дорожки,
	 * оставила бы ручку в двух значениях от края: 98 вместо 100, 2 вместо 0.
	 * Так и в каждом режиме щелчка — метка 50 на пути не стоит.
	 */
	it.each<TSlideSnap>(['none', 'magnet', 'plateau', 'settle', 'hold'])(
		'%s: захват не по центру, указатель за краем дорожки — ручка на краю хода',
		async (snap) => {
			const { owner, thumbs, root, pointer } = await mount(
				slider({ value: [10, 90], marks: [{ value: 50 }], snap }),
			)

			// Центр ручки 90 — 280 px, взялись в 284; указатель — за правым краем
			pointer('pointerdown', thumbs[1], 284)
			pointer('pointermove', root, 400)
			expect(owner.value).toEqual([10, 100])
			pointer('pointerup', root, 400)

			// Центр ручки 10 — 120 px, взялись в 116; указатель — за левым краем
			pointer('pointerdown', thumbs[0], 116)
			pointer('pointermove', root, 0)
			expect(owner.value).toEqual([0, 100])
		},
	)

	/**
	 * Ручки на одном значении у края хода. Взялись за внешнюю половину — точка
	 * нажатия за краем дорожки, и какую ручку вести, первое движение решает
	 * относительно неё. Прижатая к краю, она спутала бы направление: движение
	 * внутрь, ещё за краем, вышло бы движением наружу, и повела бы верхняя
	 * ручка — в упор в нижнюю.
	 */
	it('ручки на краю хода: взяли за внешнюю половину и повели внутрь — ведёт нижняя', async () => {
		const { owner, thumbs, root, fields, pointer } = await mount(slider({ value: [100, 100] }))

		// Центр ручек — 300 px, край дорожки; взялись в 304
		pointer('pointerdown', thumbs[1], 304)
		pointer('pointermove', root, 302)
		pointer('pointermove', root, 284)

		expect(owner.value).toEqual([90, 100])
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
		readonly events = new TEvented<{ 'change:snap': (value: TSlideSnap) => void }>()
		readonly orientation: TSlideOrientation = 'horizontal'
		readonly inverted = false
		readonly largeStep = 10
		readonly values = [10, 90]
		readonly fractions = [0.1, 0.9]
		snap: TSlideSnap = 'none'
		readonly snapRadius = 8
		readonly snapPoints = [0.5]
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

		settle(fraction: number): void {
			this.calls.push(['settle', fraction])
			this.activeThumb = undefined
		}

		shift(index: number, count: number): void {
			this.calls.push(['shift', index, count])
		}

		moveToEdge(index: number, edge: TSlideEdge): void {
			this.calls.push(['moveToEdge', index, edge])
		}
	}

	/** Доля за краем дорожки уходит владельцу как есть: прижимает он. */
	it('части — по классам владельца, доли — в направлении роста', async () => {
		const { owner, thumbs, track, root, pointer } = await mount(new TProbe())

		pointer('pointerdown', thumbs[1], 250)
		pointer('pointermove', root, 150)
		pointer('pointerup', root, 150)
		pointer('pointerdown', track, 350)

		expect(owner.calls).toEqual([
			['grab', 1, 0.75],
			['drag', 0.25],
			['release'],
			['press', 1.25],
		])
	})

	/**
	 * Режим — свойство владельца, стратегию плагин выбирает подпиской на его
	 * смену: доводка приходит командой `settle` вместо `release`.
	 */
	it('режим щелчка — по change:snap владельца; доводка — командой settle', async () => {
		const { owner, track, root, pointer } = await mount(new TProbe())

		owner.snap = 'settle'
		owner.events.emit('change:snap', 'settle')

		pointer('pointerdown', track, 196)
		pointer('pointerup', root, 196)

		expect(owner.calls).toEqual([
			['press', 0.48],
			['settle', 0.5],
		])
	})

	/** Владелец бывает долговечнее плагина: свой `ctrl` переживает перемонтирование. */
	it('уничтоженный плагин снимает подписку с владельца', async () => {
		const { owner, bundle } = await mount(new TProbe())
		const off = vi.spyOn(owner.events, 'off')

		bundle.destroy()

		expect(off).toHaveBeenCalledWith('change:snap', expect.any(Function))
	})
})

/**
 * Щелчок к меткам через плагин: радиус в px, доли по коробке дорожки. Каждая
 * стратегия отдельно — `slide-snap-strategies.spec.ts`.
 *
 * Дорожка 200 px, поэтому радиус по умолчанию (8 px) — 0.04 хода, а метка 50 —
 * в x = 200.
 */
describe('щелчок', () => {
	const marked = (props: Partial<ISliderProps> = {}) =>
		slider({ marks: [{ value: 50 }], ...props })

	it('стратегию выбирает режим владельца — с нового жеста, начатый жест держит свою', async () => {
		const { owner, track, root, pointer } = await mount(marked({ value: 20 }))

		pointer('pointerdown', track, 140)
		owner.snap = 'magnet'
		pointer('pointermove', root, 196)

		expect(owner.value).toBe(48)

		pointer('pointerup', root, 196)
		pointer('pointerdown', track, 194)

		expect(owner.value).toBe(50)
	})

	it('радиус в px переводится в долю по длине дорожки', async () => {
		const { owner, track, root, pointer } = await mount(marked({ value: 20, snap: 'magnet' }))

		// 7 px до метки — в радиусе, 10 px — за ним
		pointer('pointerdown', track, 193)
		pointer('pointerup', root, 193)
		expect(owner.value).toBe(50)

		pointer('pointerdown', track, 190)
		pointer('pointerup', root, 190)
		expect(owner.value).toBe(45)

		owner.snapRadius = 12
		pointer('pointerdown', track, 190)
		expect(owner.value).toBe(50)
	})

	/**
	 * Взялись за ручку на 4 px правее центра. Притягивается ручка, а не
	 * указатель: указатель в метке поставил бы ручку на 2 значения левее.
	 */
	it('притягивает ручку, а не указатель: смещение захвата учтено', async () => {
		const { owner, thumbs, root, pointer } = await mount(marked({ value: 40, snap: 'magnet' }))

		pointer('pointerdown', thumbs[0], 184)
		pointer('pointermove', root, 200)
		expect(owner.value).toBe(50)

		pointer('pointermove', root, 214)
		expect(owner.value).toBe(55)
	})

	/**
	 * Ручки на одном значении стоят на метке. Колебание указателя в радиусе
	 * ручку не сдвигает — и ведомую не выбирает: её выбирает первое движение
	 * за радиус.
	 */
	it('колебание в радиусе не выбирает ведомую из ручек на метке', async () => {
		const { owner, thumbs, root, pointer } = await mount(
			marked({ value: [50, 50], snap: 'magnet' }),
		)

		pointer('pointerdown', thumbs[1], 200)
		pointer('pointermove', root, 203)
		expect(owner.dragging).toBe(false)

		pointer('pointermove', root, 170)

		expect(owner.value).toEqual([35, 50])
	})

	it('plateau: на плато ручка стоит, за ним идёт со сжатием, край хода достижим', async () => {
		const { owner, thumbs, root, pointer } = await mount(marked({ value: 50, snap: 'plateau' }))

		pointer('pointerdown', thumbs[0], 200)
		pointer('pointermove', root, 207)
		expect(owner.value).toBe(50)

		// Свободно было бы 75: промежуток за плато сжат
		pointer('pointermove', root, 250)
		expect(owner.value).toBe(73)

		pointer('pointermove', root, 300)
		expect(owner.value).toBe(100)
	})

	it('settle: отпущенная в радиусе ручка доезжает до метки уже без перетаскивания', async () => {
		const { owner, thumbs, root, pointer } = await mount(marked({ value: 20, snap: 'settle' }))
		const commits: unknown[] = []
		const order: string[] = []

		owner.events.on('commit', (payload) => commits.push(payload))

		pointer('pointerdown', thumbs[0], 140)
		pointer('pointermove', root, 196)
		expect(owner.value).toBe(48)

		owner.events.on('change:dragging', (value) => order.push(`dragging:${value}`))
		owner.events.on('change:value', ({ newValue }) => order.push(`value:${newValue}`))

		pointer('pointerup', root, 196)

		expect(owner.value).toBe(50)
		expect(order).toEqual(['dragging:false', 'value:50'])
		expect(commits).toEqual([{ newValue: 50, oldValue: 20 }])
	})

	it('settle: за радиусом ручка остаётся, где отпустили', async () => {
		const { owner, thumbs, root, pointer } = await mount(marked({ value: 20, snap: 'settle' }))

		pointer('pointerdown', thumbs[0], 140)
		pointer('pointermove', root, 190)
		pointer('pointerup', root, 190)

		expect(owner.value).toBe(45)
	})

	/**
	 * Часы — поддельные: и таймер стоянки, и `performance.now()`. Кадр
	 * (`requestAnimationFrame`) не подделан — на нём плагины получают корень.
	 */
	const fakeClock = () =>
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] })

	it('hold: прошедшая метку ручка стоит на ней, потом догоняет стоящий указатель', async () => {
		const { owner, thumbs, root, pointer } = await mount(marked({ value: 20, snap: 'hold' }))

		fakeClock()

		pointer('pointerdown', thumbs[0], 140)
		pointer('pointermove', root, 210)
		expect(owner.value).toBe(50)

		vi.advanceTimersByTime(249)
		expect(owner.value).toBe(50)

		vi.advanceTimersByTime(1)
		expect(owner.value).toBe(55)
	})

	it('hold: отпустили, пока стоит, — ручка осталась на метке', async () => {
		const { owner, thumbs, root, pointer } = await mount(marked({ value: 20, snap: 'hold' }))
		const commits: unknown[] = []

		owner.events.on('commit', (payload) => commits.push(payload))
		fakeClock()

		pointer('pointerdown', thumbs[0], 140)
		pointer('pointermove', root, 210)
		pointer('pointerup', root, 210)
		vi.advanceTimersByTime(1000)

		expect(owner.value).toBe(50)
		expect(commits).toEqual([{ newValue: 50, oldValue: 20 }])
	})

	it('hold: время стоянки — опция плагина', async () => {
		const { owner, thumbs, root, pointer } = await mount(
			marked({ value: 20, snap: 'hold' }),
			'ltr',
			{ holdDelay: 40 },
		)

		fakeClock()

		pointer('pointerdown', thumbs[0], 140)
		pointer('pointermove', root, 210)
		vi.advanceTimersByTime(40)

		expect(owner.value).toBe(55)
	})
})
