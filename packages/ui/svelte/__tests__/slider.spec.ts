/**
 * Slider в Svelte — проводка целиком, на настоящей разметке.
 *
 * Жест и клавиши считают ядро и плагины (`core/__tests__/slider.spec.ts`,
 * `plugins/__tests__/slide-*.plugin.spec.ts`), раскладку и настоящий ввод —
 * браузер (`playground/vue/browser/slider.spec.ts`). Здесь важно, что они
 * сходятся в разметке: ручка на каждое значение, поле с ходом, шагом и
 * именем, позиции переменными, слоты со scope и значение, которое
 * возвращается пропом в той форме, в какой его задали. Сценарии — те же, что
 * у Vue (`slider.spec.ts`).
 */

import { describe, it, expect } from 'vitest'
import { flushSync } from 'svelte'
import { TSlider, type TSliderValue, type TValuePayload } from '@soldy-ui/core'
import { Slider, type SliderProps } from '@soldy-ui/svelte'
import Surround from './Surround.test.svelte'
import { contentOf, find, mount, nextFrame } from './mount'
import { reactiveProps } from './reactive-props.svelte'
import { scopeMarkup, scopeText } from './snippets.svelte'

/** События ползунка, которые получил потребитель, — по порядку. */
type TLog = {
	readonly values: TSliderValue[]
	readonly commits: TValuePayload<TSliderValue>[]
}

/**
 * Ползунок в документе; значение — по-настоящему: потребитель возвращает его
 * пропом, как привязка. Слушатели встают по `ready` узла — кадром позже.
 */
async function render(initial: SliderProps = {}): Promise<{ props: SliderProps; log: TLog }> {
	const log: TLog = { values: [], commits: [] }
	const props = reactiveProps<SliderProps>({
		...initial,
		onChangeValue: ({ newValue }) => {
			log.values.push(newValue)
			props.value = newValue
		},
		onCommit: (payload) => {
			log.commits.push(payload)
		},
	})

	mount(Slider, props)
	await nextFrame()

	return { props, log }
}

const all = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)]
const node = (selector: string) => find(document, selector, HTMLElement)

const fields = () =>
	[...document.querySelectorAll('.so-slider__input')].filter(
		(element): element is HTMLInputElement => element instanceof HTMLInputElement,
	)

function field(index = 0): HTMLInputElement {
	const input = fields()[index]

	if (!input) throw new Error(`поля ${index} нет`)

	return input
}

const position = (element: HTMLElement) => element.style.getPropertyValue('--so-slider-position')

/** Клавиша на поле, как у пользователя: всплывает до корня. */
function press(target: HTMLElement, key: string): void {
	target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
	flushSync()
}

describe('разметка', () => {
	it('корень — span с классами, состояниями и направлением; всё внутри — span', async () => {
		await render({ direction: 'rtl', size: 'lg' })

		const root = node('.so-slider')

		expect(root.localName).toBe('span')
		expect(root.classList.contains('so-slider--horizontal')).toBe(true)
		expect(root.classList.contains('so-slider--size-lg')).toBe(true)
		expect(root.dataset.dragging).toBe('false')
		expect(root.dataset.disabled).toBe('false')
		expect(root.getAttribute('dir')).toBe('rtl')
		// Набор ARIA — полям, не корню
		expect(root.hasAttribute('aria-orientation')).toBe(false)
		expect(
			all('.so-slider *').filter((element) => !['span', 'input'].includes(element.localName)),
		).toEqual([])
	})

	it('число — одна ручка, массив — по ручке на элемент', async () => {
		const { props } = await render({ value: 30 })

		expect(all('.so-slider__thumb')).toHaveLength(1)

		props.value = [10, 50, 90]
		flushSync()

		expect(all('.so-slider__thumb')).toHaveLength(3)
		expect(fields().map((input) => input.value)).toEqual(['10', '50', '90'])
	})

	it('поле ручки: ход, шаг, значение, name, disabled и имя', async () => {
		await render({
			value: [20, 60],
			// Зазор — в шагах шкалы: один шаг по 5
			minStepsBetweenThumbs: 1,
			step: 5,
			name: 'price',
			orientation: 'vertical',
			thumbLabels: ['От', 'До'],
			aria_label: 'Цена',
		})

		const [first, second] = fields()
		const root = node('.so-slider')

		expect(first.type).toBe('range')
		expect([first.min, first.max, first.step, first.value]).toEqual(['0', '55', '5', '20'])
		expect([second.min, second.max, second.value]).toEqual(['25', '100', '60'])
		expect(first.name).toBe('price')
		// Ориентация — на каждом поле, имя — у каждой ручки своё, из thumbLabels;
		// имя ползунка (aria_label) у нескольких ручек — у группы, корня
		expect([first, second].map((input) => input.getAttribute('aria-orientation'))).toEqual([
			'vertical',
			'vertical',
		])
		expect(first.getAttribute('aria-label')).toBe('От')
		expect(second.getAttribute('aria-label')).toBe('До')
		expect(root.getAttribute('aria-label')).toBe('Цена')
		expect(root.hasAttribute('aria-orientation')).toBe(false)
		expect(first.hasAttribute('aria-disabled')).toBe(false)
	})

	it('одна ручка: aria_label называет её поле, корень — без роли и имени', async () => {
		await render({ value: 30, aria_label: 'Громкость' })

		const root = node('.so-slider')

		expect(field().getAttribute('aria-label')).toBe('Громкость')
		expect(root.hasAttribute('role')).toBe(false)
		expect(root.hasAttribute('aria-label')).toBe(false)
	})

	it('несколько ручек: корень — группа с aria_label, у полей его нет; выключенный — нативный disabled', async () => {
		await render({ value: [20, 60], aria_label: 'Цена', disabled: true })

		const root = node('.so-slider')

		expect(root.getAttribute('role')).toBe('group')
		expect(root.getAttribute('aria-label')).toBe('Цена')
		expect(fields().map((input) => input.hasAttribute('aria-label'))).toEqual([false, false])
		expect(fields().every((input) => input.disabled)).toBe(true)
		expect(root.dataset.disabled).toBe('true')
	})

	it('число ручек сменилось — набор корня и полей за ним', async () => {
		const { props } = await render({ value: 30, aria_label: 'Цена' })
		const root = node('.so-slider')

		props.value = [20, 80]
		flushSync()

		expect(root.getAttribute('role')).toBe('group')
		expect(root.getAttribute('aria-label')).toBe('Цена')
		expect(fields().map((input) => input.hasAttribute('aria-label'))).toEqual([false, false])

		props.value = 50
		flushSync()

		expect(root.hasAttribute('role')).toBe(false)
		expect(root.hasAttribute('aria-label')).toBe(false)
		expect(field().getAttribute('aria-label')).toBe('Цена')
	})

	it('у шага списком поле без шага: step="any"', async () => {
		await render({ value: 5, step: [1, 5, 10] })

		expect(field().step).toBe('any')
	})

	it('позиции — CSS-переменными: ручка, заливка, метки', async () => {
		await render({ value: [20, 70], marks: [{ value: 50 }] })

		const range = node('.so-slider__range')

		expect(position(node('.so-slider__thumb'))).toBe('20%')
		expect(range.style.getPropertyValue('--so-slider-range-start')).toBe('20%')
		expect(range.style.getPropertyValue('--so-slider-range-end')).toBe('70%')
		expect(position(node('.so-slider__mark'))).toBe('50%')
	})

	it('атрибуты потребителя — корню, а не полям', async () => {
		await render({ value: [20, 60], title: 'Цена', class: 'mine' })

		const root = node('.so-slider')

		expect(root.title).toBe('Цена')
		expect([...root.classList].at(-1)).toBe('mine')
		expect(fields().map((input) => input.hasAttribute('title'))).toEqual([false, false])
	})
})

describe('метки', () => {
	it('не заданы — контейнера меток нет', async () => {
		await render()

		expect(document.querySelector('.so-slider__marks')).toBeNull()
	})

	/**
	 * Внутри пустой подписи — только метки блоков Svelte и пустой текстовый
	 * узел: `:empty` темы их не видит (`contentOf`), и подпись не видна, — это
	 * проверяет браузерный прогон; здесь — что в ней нет ни элемента, ни
	 * символа.
	 */
	it('подпись — label метки; без подписи — пустой узел, тема прячет его по :empty', async () => {
		await render({
			value: 20,
			marks: [{ value: 0, label: 'Мин' }, { value: 20 }, { value: 100, label: 'Макс' }],
		})

		const labels = all('.so-slider__mark-label')

		expect(labels.map((label) => label.textContent)).toEqual(['Мин', '', 'Макс'])
		expect(contentOf(labels[1])).toEqual([])
	})

	it('состояния: внутри заливки и под ручкой', async () => {
		await render({ value: 20, marks: [{ value: 0 }, { value: 20 }, { value: 100 }] })

		expect(all('.so-slider__mark').map((mark) => mark.dataset.inRange)).toEqual([
			'true',
			'true',
			'false',
		])
		expect(all('.so-slider__mark').map((mark) => mark.dataset.current)).toEqual([
			'false',
			'true',
			'false',
		])
	})

	it('true — точки шкалы', async () => {
		await render({ step: 25, marks: true })

		expect(all('.so-slider__mark').map(position)).toEqual(['0%', '25%', '50%', '75%', '100%'])
	})

	/**
	 * Подписи меток — зрительная шкала: значение и границы объявляет поле. Что
	 * в подписи `Label` их текст не входит в имя поля, проверяет браузер
	 * (`playground/vue/browser/slider.spec.ts`), здесь — что блок скрыт.
	 */
	it('блок меток — под aria-hidden', async () => {
		await render({ value: 20, marks: [{ value: 0, label: 'Мин' }, { value: 100 }] })

		expect(node('.so-slider__marks').getAttribute('aria-hidden')).toBe('true')
	})
})

describe('значение сохраняет форму', () => {
	it('число остаётся числом', async () => {
		const { log } = await render({ value: 50 })

		press(field(), 'ArrowRight')

		expect(log.values).toEqual([51])
		expect(field().value).toBe('51')
	})

	it('массив остаётся массивом', async () => {
		const { log } = await render({ value: [20, 80] })

		press(field(1), 'ArrowLeft')

		expect(log.values).toEqual([[20, 79]])
		expect(field(1).value).toBe('79')
	})

	it('commit — событием компонента, в форме значения', async () => {
		const { log } = await render({ value: [20, 80] })

		press(field(0), 'End')

		expect(log.commits).toEqual([{ newValue: [80, 80], oldValue: [20, 80] }])
	})

	it('ctrl: значение снаружи и из разметки — одно', async () => {
		const ctrl = new TSlider({ value: 10 })

		await render({ ctrl })

		ctrl.value = 40
		flushSync()

		expect(field().value).toBe('40')
		expect(position(node('.so-slider__thumb'))).toBe('40%')
	})
})

describe('слоты со scope', () => {
	it('mark получает значение и подпись метки', () => {
		mount(Slider, {
			marks: [{ value: 0, label: 'Мин' }, { value: 100 }],
			mark: scopeText<{ value: number; label: string | undefined }>(
				({ value, label }) => `${label ?? '—'}:${value}`,
			),
		})

		expect(all('.so-slider__mark-label').map((label) => label.textContent)).toEqual([
			'Мин:0',
			'—:100',
		])
	})

	it('thumb — содержимое подсказки, со значением и номером ручки', () => {
		mount(Slider, {
			value: [20, 80],
			tooltip: 'always',
			thumb: scopeMarkup<{ value: number; index: number }>(
				({ value, index }) => `<b class="so-test-thumb">${index}:${value}</b>`,
			),
		})

		const probes = all('.so-test-thumb')

		expect(probes.map((probe) => probe.textContent)).toEqual(['0:20', '1:80'])
		expect(probes.map((probe) => probe.parentElement?.className)).toEqual([
			'so-slider__tooltip',
			'so-slider__tooltip',
		])
	})
})

/**
 * Подсказка со значением — разметка внутри ручки. Рисовать ли её, решает ядро
 * (`tooltipRendered`), когда показывать в `auto` — тема: это и то, что
 * подсказка едет за ручкой, проверяет браузер
 * (`playground/vue/browser/slider.spec.ts`).
 */
describe('подсказка со значением', () => {
	const tooltips = () => all('.so-slider__tooltip')

	it('без режима подсказки нет, и слот thumb не рисуется', () => {
		mount(Slider, {
			value: [20, 80],
			thumb: scopeMarkup<{ value: number; index: number }>(
				() => '<b class="so-test-thumb">?</b>',
			),
		})

		expect(node('.so-slider').classList.contains('so-slider--tooltip-none')).toBe(true)
		expect(tooltips()).toEqual([])
		expect(all('.so-test-thumb')).toEqual([])
	})

	it('auto — по подсказке на ручку сразу после поля, под aria-hidden', async () => {
		await render({ value: [20, 80], tooltip: 'auto' })

		expect(node('.so-slider').classList.contains('so-slider--tooltip-auto')).toBe(true)
		expect(tooltips().map((tooltip) => tooltip.localName)).toEqual(['span', 'span'])
		expect(tooltips().map((tooltip) => tooltip.previousElementSibling?.localName)).toEqual([
			'input',
			'input',
		])
		expect(tooltips().map((tooltip) => tooltip.getAttribute('aria-hidden'))).toEqual([
			'true',
			'true',
		])
	})

	it('текст — значение ручки, без пробелов, и меняется вместе с ним', async () => {
		await render({ value: [20, 80], tooltip: 'auto' })

		expect(tooltips().map((tooltip) => tooltip.textContent)).toEqual(['20', '80'])

		press(field(1), 'ArrowLeft')

		expect(tooltips().map((tooltip) => tooltip.textContent)).toEqual(['20', '79'])
	})

	it('режим с экземпляра: включили — подсказка есть, выключили — нет', async () => {
		const ctrl = new TSlider({ value: 30 })

		await render({ ctrl })

		expect(tooltips()).toEqual([])

		ctrl.tooltip = 'always'
		flushSync()

		expect(node('.so-slider').classList.contains('so-slider--tooltip-always')).toBe(true)
		expect(tooltips().map((tooltip) => tooltip.textContent)).toEqual(['30'])

		ctrl.tooltip = 'none'
		flushSync()

		expect(tooltips()).toEqual([])
	})
})

describe('в подписи Label', () => {
	/**
	 * Подпись — цель клика первого поля: оно её первый labelable-потомок. Имена
	 * нескольких ручек при этом даёт `thumbLabels`, первой тоже (APG,
	 * Multi-Thumb Slider): в подписи значение второго поля вошло бы в имя
	 * первого. Имена в подписи считает браузер — `describe('имена ручек')` в
	 * `playground/vue/browser/slider.spec.ts`.
	 */
	it('подпись связана с первым полем', () => {
		mount(Surround, {
			around: 'label',
			control: 'slider',
			text: 'Цена',
			slider: { value: [20, 80] },
		})

		expect(document.querySelector('label')?.control).toBe(field(0))
	})
})
