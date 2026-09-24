/**
 * Slider во Vue — проводка целиком, на настоящей разметке.
 *
 * Жест и клавиши считают ядро и плагины (`core/__tests__/slider.spec.ts`,
 * `plugins/__tests__/slide-*.plugin.spec.ts`), раскладку и настоящий ввод —
 * браузер (`playground/vue/browser/slider.spec.ts`). Здесь важно, что они
 * сходятся в разметке: ручка на каждое значение, поле с ходом, шагом и
 * именем, позиции переменными, слоты со scope и `v-model` в той форме, в
 * какой его задали.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { TSlider } from '@soldy-ui/core'
import type { ISliderProps, TSliderValue } from '@soldy-ui/core'
import type { DescriptorSlots, SliderDescriptor } from '@soldy-ui/setup'
import { Label, Slider } from '@soldy-ui/vue'

type TMarkScope = DescriptorSlots<typeof SliderDescriptor>['mark']
type TThumbScope = DescriptorSlots<typeof SliderDescriptor>['thumb']

/** Плагины цепляют слушатели по `element:ready`, а оно приходит кадром. */
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

/** Ползунок в документе; `v-model` — по-настоящему: значение возвращается пропом. */
async function render(props: Partial<ISliderProps> & Record<string, unknown> = {}) {
	const mounted = mount(Slider, {
		props: {
			...props,
			'onUpdate:value': (value: TSliderValue) => mounted.setProps({ value }),
		},
		attachTo: document.body,
	})

	wrapper = mounted

	await nextTick()
	await nextFrame()

	return mounted
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function find(selector: string, scope: ParentNode = document): HTMLElement {
	const element = scope.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const all = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)]
const fields = () => all('.s-slider__input').filter((node) => node instanceof HTMLInputElement)
const field = (index = 0) => {
	const node = fields()[index]

	if (!(node instanceof HTMLInputElement)) throw new Error(`поля ${index} нет`)

	return node
}

const position = (node: HTMLElement) => node.style.getPropertyValue('--s-slider-position')

/** Клавиша на поле, как у пользователя: всплывает до корня. */
async function press(target: HTMLElement, key: string): Promise<void> {
	target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
	await nextTick()
}

describe('разметка', () => {
	it('корень — span с классами, состояниями и направлением; всё внутри — span', async () => {
		await render({ direction: 'rtl', size: 'lg' })

		const root = find('.s-slider')

		expect(root.localName).toBe('span')
		expect(root.classList.contains('s-slider--horizontal')).toBe(true)
		expect(root.classList.contains('s-slider--size-lg')).toBe(true)
		expect(root.dataset.dragging).toBe('false')
		expect(root.dataset.disabled).toBe('false')
		expect(root.getAttribute('dir')).toBe('rtl')
		// Набор ARIA — полям, не корню
		expect(root.hasAttribute('aria-orientation')).toBe(false)
		expect(
			all('.s-slider *').filter((node) => !['span', 'input'].includes(node.localName)),
		).toEqual([])
	})

	it('число — одна ручка, массив — по ручке на элемент', async () => {
		const mounted = await render({ value: 30 })

		expect(all('.s-slider__thumb')).toHaveLength(1)

		await mounted.setProps({ value: [10, 50, 90] })

		expect(all('.s-slider__thumb')).toHaveLength(3)
		expect(fields().map((node) => node.value)).toEqual(['10', '50', '90'])
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

		expect(first.type).toBe('range')
		expect([first.min, first.max, first.step, first.value]).toEqual(['0', '55', '5', '20'])
		expect([second.min, second.max, second.value]).toEqual(['25', '100', '60'])
		expect(first.name).toBe('price')
		// Общий набор — на каждое поле, имя ручки из thumbLabels сильнее aria_label
		expect(first.getAttribute('aria-orientation')).toBe('vertical')
		expect(first.getAttribute('aria-label')).toBe('От')
		expect(second.getAttribute('aria-label')).toBe('До')
		expect(first.hasAttribute('aria-disabled')).toBe(false)
	})

	it('без имён ручек поле называет aria_label; выключенный — нативный disabled', async () => {
		await render({ value: [20, 60], aria_label: 'Цена', disabled: true })

		expect(fields().map((node) => node.getAttribute('aria-label'))).toEqual(['Цена', 'Цена'])
		expect(fields().every((node) => node.disabled)).toBe(true)
		expect(find('.s-slider').dataset.disabled).toBe('true')
	})

	it('у шага списком поле без шага: step="any"', async () => {
		await render({ value: 5, step: [1, 5, 10] })

		expect(field().step).toBe('any')
	})

	it('позиции — CSS-переменными: ручка, заливка, метки', async () => {
		await render({ value: [20, 70], marks: [{ value: 50 }] })

		expect(position(find('.s-slider__thumb'))).toBe('20%')
		expect(find('.s-slider__range').style.getPropertyValue('--s-slider-range-start')).toBe(
			'20%',
		)
		expect(find('.s-slider__range').style.getPropertyValue('--s-slider-range-end')).toBe('70%')
		expect(position(find('.s-slider__mark'))).toBe('50%')
	})
})

describe('метки', () => {
	it('не заданы — контейнера меток нет', async () => {
		await render()

		expect(document.querySelector('.s-slider__marks')).toBeNull()
	})

	/**
	 * Внутри пустой подписи — только текстовые узлы нулевой длины (якоря
	 * фрагмента слота и пустая запасная подпись). Браузерный `:empty` их не
	 * считает, jsdom — считает, поэтому что подпись не видна, проверяет
	 * браузерный прогон; здесь — что в ней нет ни элемента, ни символа.
	 */
	it('подпись — label метки; без подписи — пустой узел, тема прячет его по :empty', async () => {
		await render({
			value: 20,
			marks: [{ value: 0, label: 'Мин' }, { value: 20 }, { value: 100, label: 'Макс' }],
		})

		const labels = all('.s-slider__mark-label')
		const empty = [...labels[1].childNodes].every(
			(node) => node.nodeType === Node.TEXT_NODE && node.textContent === '',
		)

		expect(labels.map((node) => node.textContent)).toEqual(['Мин', '', 'Макс'])
		expect(empty).toBe(true)
	})

	it('состояния: внутри заливки и под ручкой', async () => {
		await render({ value: 20, marks: [{ value: 0 }, { value: 20 }, { value: 100 }] })

		expect(all('.s-slider__mark').map((node) => node.dataset.inRange)).toEqual([
			'true',
			'true',
			'false',
		])
		expect(all('.s-slider__mark').map((node) => node.dataset.current)).toEqual([
			'false',
			'true',
			'false',
		])
	})

	it('true — точки шкалы', async () => {
		await render({ step: 25, marks: true })

		expect(all('.s-slider__mark').map(position)).toEqual(['0%', '25%', '50%', '75%', '100%'])
	})
})

describe('v-model сохраняет форму значения', () => {
	it('число остаётся числом', async () => {
		const mounted = await render({ value: 50 })

		await press(field(), 'ArrowRight')

		expect(mounted.emitted('update:value')).toEqual([[51]])
		expect(field().value).toBe('51')
	})

	it('массив остаётся массивом', async () => {
		const mounted = await render({ value: [20, 80] })

		await press(field(1), 'ArrowLeft')

		expect(mounted.emitted('update:value')).toEqual([[[20, 79]]])
		expect(field(1).value).toBe('79')
	})

	it('commit — событием компонента, в форме значения', async () => {
		const mounted = await render({ value: [20, 80] })

		await press(field(0), 'End')

		expect(mounted.emitted('commit')).toEqual([[{ newValue: [80, 80], oldValue: [20, 80] }]])
	})

	it('ctrl: значение снаружи и из разметки — одно', async () => {
		const ctrl = new TSlider({ value: 10 })

		await render({ ctrl })

		ctrl.value = 40
		await nextTick()

		expect(field().value).toBe('40')
		expect(position(find('.s-slider__thumb'))).toBe('40%')
	})
})

describe('слоты со scope', () => {
	it('mark получает значение и подпись метки', async () => {
		wrapper = mount(Slider, {
			props: { marks: [{ value: 0, label: 'Мин' }, { value: 100 }] },
			slots: {
				mark: ({ value, label }: TMarkScope) => `${label ?? '—'}:${value}`,
			},
			attachTo: document.body,
		})
		await nextTick()

		expect(all('.s-slider__mark-label').map((node) => node.textContent)).toEqual([
			'Мин:0',
			'—:100',
		])
	})

	it('thumb — после поля ручки, со значением и номером', async () => {
		wrapper = mount(Slider, {
			props: { value: [20, 80] },
			slots: {
				thumb: ({ value, index }: TThumbScope) =>
					h('b', { class: 's-test-thumb' }, `${index}:${value}`),
			},
			attachTo: document.body,
		})
		await nextTick()

		const probes = all('.s-test-thumb')

		expect(probes.map((node) => node.textContent)).toEqual(['0:20', '1:80'])
		expect(probes.map((node) => node.previousElementSibling?.localName)).toEqual([
			'input',
			'input',
		])
	})
})

describe('в подписи Label', () => {
	/**
	 * Подпись называет только первое поле — первый labelable-потомок. Второй
	 * ручке имя даёт `thumbLabels` (APG, Multi-Thumb Slider).
	 */
	it('подпись связана с первым полем', async () => {
		wrapper = mount(Label, {
			props: { text: 'Цена' },
			slots: { default: () => h(Slider, { value: [20, 80] }) },
			attachTo: document.body,
		})
		await nextTick()

		const label = document.querySelector('label')

		expect(label?.control).toBe(field(0))
	})
})
