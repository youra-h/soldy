// @vitest-environment jsdom

/**
 * Оценка звёздами в плагинах: наведение (`TRatingHoverPlugin`) и плагины
 * перетаскивания Slider (`TSlidePointerPlugin`, `TSlideKeyboardPlugin`),
 * которые говорят с `TRating` через контракт `ISlidable`.
 *
 * Разметку тест строит сам — корень, дорожка со звёздами и ручка с полем во
 * весь ряд, как их рисует Vue, — а плагины собраны настоящим набором. Коробку
 * дорожки задаёт тест: jsdom раскладку не считает. Захвата указателя в jsdom
 * нет, поэтому события тест шлёт прямо в корень; настоящий ввод —
 * `playground/vue/browser/rating.spec.ts`.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { TRating } from '@soldy-ui/core'
import type { IRatingProps } from '@soldy-ui/core'
import {
	TElementPlugin,
	TPluginBundle,
	TRatingHoverPlugin,
	TSlideKeyboardPlugin,
	TSlidePointerPlugin,
} from '../src'
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

/** Дорожка — пять звёзд по 40 px: левый край — 100, правый — 300. */
const TRACK = new DOMRect(100, 100, 200, 40)

/** Середина по вертикали ряда. */
const Y = 120

/** Оценка на странице: корень, дорожка со звёздами и ручка с полем во весь ряд. */
async function mount(props: Partial<IRatingProps> = {}, dir: 'ltr' | 'rtl' = 'ltr') {
	const owner = new TRating(props)
	const bundle = new TPluginBundle(owner)
		.use(TElementPlugin)
		.use(TSlidePointerPlugin)
		.use(TSlideKeyboardPlugin)
		.use(TRatingHoverPlugin)

	bundles.push(bundle)

	const root = document.createElement('span')
	const track = document.createElement('span')
	const thumb = document.createElement('span')
	const field = document.createElement('input')

	root.dir = dir
	root.className = owner.classes.base
	track.className = owner.classes.resolve('__track')
	thumb.className = owner.classes.resolve('__thumb')
	field.type = 'range'
	field.max = String(owner.max)
	field.step = String(owner.step)
	field.value = String(owner.value)

	const stars = owner.stars.map(() => {
		const star = document.createElement('span')

		star.className = owner.classes.resolve('__star')
		track.append(star)

		return star
	})

	thumb.append(field)
	track.append(thumb)
	root.append(track)
	document.body.append(root)
	vi.spyOn(track, 'getBoundingClientRect').mockReturnValue(TRACK)

	pluginOf(bundle, TElementPlugin).element = root
	await nextFrame()

	/** Указатель над точкой `x`: событие всплывает до корня. */
	const pointer = (
		type: string,
		x: number,
		target: Element = stars[0],
		init: PointerEventInit = {},
	): PointerEvent => {
		const event = new PointerEvent(type, {
			bubbles: true,
			cancelable: true,
			clientX: x,
			clientY: Y,
			pointerId: 1,
			pointerType: 'mouse',
			button: 0,
			...init,
		})

		target.dispatchEvent(event)

		return event
	}

	/** Клавиша на поле, всплывает до корня. */
	const press = (key: string, init: KeyboardEventInit = {}) => {
		const event = new KeyboardEvent('keydown', {
			key,
			bubbles: true,
			cancelable: true,
			...init,
		})

		field.dispatchEvent(event)

		return event
	}

	return { owner, bundle, root, field, stars, pointer, press }
}

describe('наведение — предпросмотр', () => {
	it('указатель над звездой — предпросмотр её оценки; ушёл с корня — значение', async () => {
		const { owner, root, pointer } = await mount({ value: 1 })

		pointer('pointermove', 150)
		expect(owner.preview).toBe(2)

		pointer('pointermove', 270)
		expect(owner.preview).toBe(5)

		root.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))
		expect(owner.preview).toBeUndefined()
		expect(owner.value).toBe(1)
	})

	it('при шаге 0,5 левая половина звезды — половина', async () => {
		const { owner, pointer } = await mount({ step: 0.5 })

		pointer('pointermove', 185)
		expect(owner.preview).toBe(2.5)

		pointer('pointermove', 205)
		expect(owner.preview).toBe(3)
	})

	it('RTL: ряд растёт справа — первая звезда у правого края', async () => {
		const { owner, pointer } = await mount({ step: 0.5 }, 'rtl')

		pointer('pointermove', 290)
		expect(owner.preview).toBe(0.5)

		pointer('pointermove', 115)
		expect(owner.preview).toBe(5)
	})

	it('касание — не наведение: палец над звездой — уже нажатие', async () => {
		const { owner, pointer } = await mount()

		pointer('pointermove', 250, undefined, { pointerType: 'touch' })

		expect(owner.preview).toBeUndefined()
	})

	it('у оценки только для показа предпросмотра нет', async () => {
		const { owner, pointer } = await mount({ value: 3, readonly: true })

		pointer('pointermove', 280)

		expect(owner.preview).toBeUndefined()
	})

	it('корня не стало — предпросмотр снят, слушателей нет', async () => {
		const { owner, bundle, root, pointer } = await mount()

		pointer('pointermove', 250)
		expect(owner.preview).toBe(4)

		pluginOf(bundle, TElementPlugin).element = null
		expect(owner.preview).toBeUndefined()

		pointer('pointermove', 250, root)
		expect(owner.preview).toBeUndefined()
	})
})

describe('нажатие — плагин указателя Slider', () => {
	it('нажатие на левую половину звезды при шаге 0,5 — половина; фокус — полю', async () => {
		const { owner, field, pointer } = await mount({ step: 0.5 })

		const down = pointer('pointerdown', 185)

		expect(owner.value).toBe(2.5)
		expect(down.defaultPrevented).toBe(true)
		expect(document.activeElement).toBe(field)

		pointer('pointerup', 185)
	})

	it('протяжка по звёздам ведёт оценку, commit — при отпускании', async () => {
		const { owner, pointer } = await mount()
		const commits = vi.fn()

		owner.events.on('commit', commits)

		pointer('pointerdown', 110)
		expect(owner.value).toBe(1)

		pointer('pointermove', 230)
		expect(owner.value).toBe(4)
		expect(commits).not.toHaveBeenCalled()

		pointer('pointerup', 230)
		expect(commits).toHaveBeenCalledExactlyOnceWith({ newValue: 4, oldValue: 0 })
	})

	it('RTL: нажатие у правого края — первая звезда', async () => {
		const { owner, pointer } = await mount({}, 'rtl')

		pointer('pointerdown', 295)

		expect(owner.value).toBe(1)

		pointer('pointerup', 295)
	})

	it('оценку только для показа нажатие не меняет и не гасит', async () => {
		const { owner, pointer } = await mount({ value: 2, readonly: true })

		const down = pointer('pointerdown', 290)

		expect(owner.value).toBe(2)
		expect(down.defaultPrevented).toBe(false)
	})
})

describe('клавиши — плагин клавиатуры Slider', () => {
	it('стрелка — шаг, PageUp — звезда, Home — «оценки нет»', async () => {
		const { owner, press } = await mount({ value: 2, step: 0.5 })

		expect(press('ArrowRight').defaultPrevented).toBe(true)
		expect(owner.value).toBe(2.5)

		press('PageUp')
		expect(owner.value).toBe(3.5)

		press('Home')
		expect(owner.value).toBe(0)
	})

	it('у оценки только для показа клавиша гасится и значение не меняет', async () => {
		const { owner, press } = await mount({ value: 2, readonly: true })

		expect(press('ArrowRight').defaultPrevented).toBe(true)
		expect(owner.value).toBe(2)
	})
})
