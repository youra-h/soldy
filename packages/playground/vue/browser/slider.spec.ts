/**
 * Ползунок в настоящем браузере: раскладка и настоящий ввод.
 *
 * jsdom не считает раскладку — у дорожки там нет ни ширины, ни положения, — и
 * не выполняет действий браузера: нативный сдвиг поля от стрелки и действие
 * подписи `Label` на `click` он не делает вовсе. Поэтому жест здесь — настоящим
 * вводом Playwright (`userEvent` с позицией), а не синтетическим
 * `PointerEvent`: только так видно, что нажатие гасит выделение и фокус
 * браузера, захват указателя доводит отпускание до корня, а стрелка делает
 * ровно один шаг — ядра, без нативного.
 *
 * Позиции — от левого верхнего угла дорожки: её коробка — ход центров ручек,
 * 0 и 1 доли — её края по оси (контракт темы с плагином указателя).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h } from 'vue'
import { TSlider } from '@soldy-ui/core'
import type { ISliderProps } from '@soldy-ui/core'
import { Label, Slider } from '@soldy-ui/vue'

import '@soldy-ui/theme-oren'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

type THarness = {
	/** Направление письма страницы */
	dir?: 'ltr' | 'rtl'
	/** Ползунок в подписи `Label` */
	label?: boolean
}

/**
 * Ползунок на странице шириной 400 px. Значение держит экземпляр ядра: по нему
 * тест и читает результат жеста.
 */
async function mount(
	props: Partial<ISliderProps> = {},
	{ dir = 'ltr', label = false }: THarness = {},
) {
	const ctrl = new TSlider(props)
	const slider = () => h(Slider, { ctrl })

	render(
		defineComponent({
			render: () =>
				h('div', { dir, style: 'width: 400px; padding: 24px' }, [
					label ? h(Label, { text: 'Цена', position: 'top' }, slider) : slider(),
				]),
		}),
	)

	// Плагины получают корень кадром
	await nextFrame()
	await nextFrame()

	return ctrl
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function find(selector: string): HTMLElement {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const all = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)]
const track = () => find('.s-slider__track')
const thumbs = () => all('.s-slider__thumb')
const fields = () => all('.s-slider__input')

/** Поле ручки `index`; нет его — тест падает здесь. */
function field(index: number): HTMLInputElement {
	const node = fields()[index]

	if (!(node instanceof HTMLInputElement)) throw new Error(`поля ${index} нет`)

	return node
}

/**
 * Точка у доли хода `fraction` — от левого верхнего угла дорожки: по оси —
 * доля её длины, поперёк — середина.
 */
function along(fraction: number, orientation: 'horizontal' | 'vertical' = 'horizontal') {
	const box = track().getBoundingClientRect()

	return orientation === 'horizontal'
		? { x: box.width * fraction, y: box.height / 2 }
		: { x: box.width / 2, y: box.height * fraction }
}

/** Центр узла по горизонтали — в координатах окна. */
const centerX = (node: Element) => {
	const box = node.getBoundingClientRect()

	return box.left + box.width / 2
}

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
})

afterEach(() => {
	cleanup()
})

describe('раскладка', () => {
	it('центр ручки — на своей доле дорожки; в RTL — от правого края', async () => {
		await mount({ value: 25 })

		const ltr = track().getBoundingClientRect()

		expect(Math.abs(centerX(thumbs()[0]) - (ltr.left + ltr.width * 0.25))).toBeLessThan(0.5)

		cleanup()
		await mount({ value: 25 }, { dir: 'rtl' })

		const rtl = track().getBoundingClientRect()

		expect(Math.abs(centerX(thumbs()[0]) - (rtl.right - rtl.width * 0.25))).toBeLessThan(0.5)
	})

	it('пустая подпись метки не видна, метка остаётся точкой', async () => {
		await mount({ value: 50, marks: [{ value: 0, label: 'Мин' }, { value: 50 }] })

		const [named, empty] = all('.s-slider__mark-label')

		expect(getComputedStyle(named).display).not.toBe('none')
		expect(getComputedStyle(empty).display).toBe('none')
	})
})

describe('нажатие на дорожке', () => {
	it('ставит ближайшую ручку в точку нажатия', async () => {
		const ctrl = await mount({ value: [10, 90] })

		await userEvent.click(track(), { position: along(0.3) })

		expect(ctrl.value).toEqual([30, 90])
	})

	it('RTL: ход растёт справа налево', async () => {
		const ctrl = await mount({ value: 0 }, { dir: 'rtl' })

		await userEvent.click(track(), { position: along(0.3) })

		expect(ctrl.value).toBe(70)
	})

	it('inverted: ход растёт в обратную сторону', async () => {
		const ctrl = await mount({ value: 0, inverted: true })

		await userEvent.click(track(), { position: along(0.3) })

		expect(ctrl.value).toBe(70)
	})

	it('вертикальный: ход растёт снизу вверх', async () => {
		const ctrl = await mount({ value: 0, orientation: 'vertical' })

		await userEvent.click(track(), { position: along(0.25, 'vertical') })

		expect(ctrl.value).toBe(75)
	})
})

describe('протяжка', () => {
	/**
	 * Взялись за ручку на 6 px правее центра — это полтора шага. Без
	 * смещения захвата значение прыгнуло бы к точке нажатия.
	 */
	it('ручка идёт за указателем со смещением захвата', async () => {
		const ctrl = await mount({ value: 50 })
		const from = along(0.5)
		const to = along(0.7)

		await userEvent.dragAndDrop(track(), track(), {
			sourcePosition: { x: from.x + 6, y: from.y },
			targetPosition: { x: to.x + 6, y: to.y },
		})

		expect(ctrl.value).toBe(70)
	})

	it('две ручки не перехлёстываются', async () => {
		const ctrl = await mount({ value: [20, 60] })

		await userEvent.dragAndDrop(track(), track(), {
			sourcePosition: along(0.2),
			targetPosition: along(0.95),
		})

		expect(ctrl.value).toEqual([60, 60])
	})

	/**
	 * Отпустили над текстом подписи — вне ползунка, но внутри `label`. Без
	 * захвата указателя и без погашенного `click` подпись отдала бы фокус
	 * первому полю.
	 */
	it('в подписи Label фокус остаётся на тянутой ручке', async () => {
		const ctrl = await mount({ value: [20, 80] }, { label: true })

		await userEvent.dragAndDrop(track(), find('.s-label__text'), {
			sourcePosition: along(0.8),
		})

		expect(ctrl.values[0]).toBe(20)
		expect(document.activeElement).toBe(fields()[1])
	})
})

describe('клавиатура', () => {
	it('стрелка — ровно один шаг ядра: нативный сдвиг поля отменён', async () => {
		const ctrl = await mount({ value: 50 })

		await userEvent.click(thumbs()[0])
		expect(document.activeElement).toBe(fields()[0])

		await userEvent.keyboard('{ArrowRight}')

		expect(ctrl.value).toBe(51)
		await expect.poll(() => field(0).value).toBe('51')
	})

	it('RTL: → убавляет — ручка идёт туда, куда смотрит стрелка', async () => {
		const ctrl = await mount({ value: 50 }, { dir: 'rtl' })

		await userEvent.click(thumbs()[0])
		await userEvent.keyboard('{ArrowRight}')

		expect(ctrl.value).toBe(49)
	})
})
