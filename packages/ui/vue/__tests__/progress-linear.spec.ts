/**
 * ProgressLinear во Vue — проводка на настоящей разметке.
 *
 * Долю, `aria-value*`, `data-indeterminate` и модификатор оси считает ядро
 * (`core/__tests__/progress-linear.spec.ts`), переходы и бег рисует тема
 * (`playground/vue/browser/progress-linear.spec.ts`). Здесь важно, что всё это
 * доезжает до разметки: наборы, модификатор и доля — на корне, внутри одна
 * заливка без привязок.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick, ref } from 'vue'
import { TProgressLinear } from '@soldy-ui/core'
import { ProgressLinear } from '@soldy-ui/vue'

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
})

/** Корень полосы; нет его — тест падает здесь, а не на чтении атрибута. */
function root(): HTMLElement {
	const element = wrapper?.element

	if (!(element instanceof HTMLElement)) throw new Error('корня полосы нет')

	return element
}

/** Доля готового на корне; пустая строка — переменной нет. */
const percent = () => root().style.getPropertyValue('--s-progress-linear-percent')

describe('первая отрисовка', () => {
	it('по умолчанию полоса пуста: доля 0, aria-valuenow="0", бега нет, ось горизонтальная', () => {
		wrapper = mount(ProgressLinear)

		const node = root()

		expect(node.localName).toBe('span')
		expect(node.classList.contains('s-progress-linear')).toBe(true)
		expect(node.classList.contains('s-progress-linear--size-normal')).toBe(true)
		expect(node.classList.contains('s-progress-linear--horizontal')).toBe(true)
		expect(node.getAttribute('role')).toBe('progressbar')
		expect(node.getAttribute('aria-valuemin')).toBe('0')
		expect(node.getAttribute('aria-valuemax')).toBe('100')
		expect(node.getAttribute('aria-valuenow')).toBe('0')
		expect(node.hasAttribute('aria-orientation')).toBe(false)
		expect(node.dataset.indeterminate).toBe('false')
		expect(percent()).toBe('0%')
	})

	it('флаг из разметки: роль и шкала без aria-valuenow, бег, переменной нет', () => {
		wrapper = mount(ProgressLinear, { props: { value: 40, indeterminate: true } })

		const node = root()

		expect(node.getAttribute('role')).toBe('progressbar')
		expect(node.getAttribute('aria-valuemax')).toBe('100')
		expect(node.hasAttribute('aria-valuenow')).toBe(false)
		expect(node.dataset.indeterminate).toBe('true')
		expect(percent()).toBe('')
	})

	it('доля известна: aria-valuenow, data-indeterminate="false" и переменная на корне', () => {
		wrapper = mount(ProgressLinear, { props: { value: 40, direction: 'rtl' } })

		const node = root()

		expect(node.getAttribute('aria-valuenow')).toBe('40')
		expect(node.dataset.indeterminate).toBe('false')
		expect(percent()).toBe('40%')
		// Бег в RTL тема зеркалит по атрибуту
		expect(node.getAttribute('dir')).toBe('rtl')
	})

	it('вертикальная ось — модификатором на корне, без aria-orientation', () => {
		wrapper = mount(ProgressLinear, { props: { value: 40, orientation: 'vertical' } })

		const node = root()

		expect(node.classList.contains('s-progress-linear--vertical')).toBe(true)
		expect(node.classList.contains('s-progress-linear--horizontal')).toBe(false)
		expect(node.hasAttribute('aria-orientation')).toBe(false)
		expect(percent()).toBe('40%')
	})

	it('внутри — одна заливка: span только с классом, без стиля и слотов', () => {
		wrapper = mount(ProgressLinear, {
			props: { value: 40 },
			slots: { default: () => 'текст' },
		})

		const children = [...root().children]

		expect(children).toHaveLength(1)
		expect(children[0].localName).toBe('span')
		expect(children[0].getAttributeNames()).toEqual(['class'])
		expect(children[0].className).toBe('s-progress-linear__range')
		// Содержимое роли `progressbar` скринридер не читает — слота нет
		expect(root().textContent).toBe('')
	})
})

describe('смена значения и флага', () => {
	it('флаг поверх значения и обратно: после снятия снова видна доля', async () => {
		const mounted = mount(ProgressLinear, { props: { value: 60 } })

		wrapper = mounted

		expect(percent()).toBe('60%')

		await mounted.setProps({ indeterminate: true })

		expect(root().hasAttribute('aria-valuenow')).toBe(false)
		expect(root().dataset.indeterminate).toBe('true')
		expect(percent()).toBe('')

		await mounted.setProps({ indeterminate: false })

		expect(root().getAttribute('aria-valuenow')).toBe('60')
		expect(root().dataset.indeterminate).toBe('false')
		expect(percent()).toBe('60%')
	})

	it('снятый из разметки флаг — снова доля: умолчание флага — false', async () => {
		const running = ref(true)

		wrapper = mount({
			render: () =>
				h(
					ProgressLinear,
					running.value ? { value: 30, indeterminate: true } : { value: 30 },
				),
		})

		expect(root().dataset.indeterminate).toBe('true')
		expect(percent()).toBe('')

		running.value = false
		await nextTick()

		expect(root().dataset.indeterminate).toBe('false')
		expect(percent()).toBe('30%')
	})

	it('снятое из разметки значение — пустая полоса: умолчание — 0', async () => {
		const shown = ref(true)

		wrapper = mount({
			render: () => h(ProgressLinear, shown.value ? { value: 30 } : {}),
		})

		expect(percent()).toBe('30%')

		shown.value = false
		await nextTick()

		expect(root().getAttribute('aria-valuenow')).toBe('0')
		expect(root().dataset.indeterminate).toBe('false')
		expect(percent()).toBe('0%')
	})

	it('смена оси меняет модификатор на корне', async () => {
		const mounted = mount(ProgressLinear, { props: { value: 20 } })

		wrapper = mounted

		await mounted.setProps({ orientation: 'vertical' })

		expect(root().classList.contains('s-progress-linear--vertical')).toBe(true)
		expect(root().classList.contains('s-progress-linear--horizontal')).toBe(false)

		await mounted.setProps({ orientation: undefined })

		expect(root().classList.contains('s-progress-linear--horizontal')).toBe(true)
		expect(root().classList.contains('s-progress-linear--vertical')).toBe(false)
	})

	it('смена шкалы пересчитывает долю и aria-value*', async () => {
		const mounted = mount(ProgressLinear, { props: { value: 60 } })

		wrapper = mounted

		await mounted.setProps({ max: 200 })

		expect(percent()).toBe('30%')
		expect(root().getAttribute('aria-valuemax')).toBe('200')

		await mounted.setProps({ min: 40 })

		expect(percent()).toBe('12.5%')
		expect(root().getAttribute('aria-valuemin')).toBe('40')
	})
})

describe('внешний ctrl', () => {
	it('разметка — по его значению, смена у экземпляра доезжает', async () => {
		const ctrl = new TProgressLinear({ value: 25 })

		wrapper = mount(ProgressLinear, { props: { ctrl } })

		expect(root().getAttribute('aria-valuenow')).toBe('25')
		expect(percent()).toBe('25%')

		ctrl.indeterminate = true
		await nextTick()

		expect(root().dataset.indeterminate).toBe('true')
		expect(percent()).toBe('')

		ctrl.value = 90
		ctrl.indeterminate = false
		await nextTick()

		expect(percent()).toBe('90%')

		ctrl.orientation = 'vertical'
		await nextTick()

		expect(root().classList.contains('s-progress-linear--vertical')).toBe(true)
	})

	it('пропсы разметки ложатся поверх ctrl', () => {
		const ctrl = new TProgressLinear({ value: 25 })

		wrapper = mount(ProgressLinear, { props: { ctrl, max: 50 } })

		expect(ctrl.max).toBe(50)
		expect(percent()).toBe('50%')
	})

	it('бег и ось внешнего ctrl переживают монтирование без этих пропсов', () => {
		const ctrl = new TProgressLinear({
			value: 25,
			indeterminate: true,
			orientation: 'vertical',
		})

		wrapper = mount(ProgressLinear, { props: { ctrl } })

		expect(root().dataset.indeterminate).toBe('true')
		expect(root().classList.contains('s-progress-linear--vertical')).toBe(true)
	})
})

describe('имя', () => {
	it('без aria_label имени нет, а полоса не прячется', () => {
		wrapper = mount(ProgressLinear, { props: { value: 40 } })

		expect(root().hasAttribute('aria-label')).toBe(false)
		expect(root().hasAttribute('aria-hidden')).toBe(false)
	})

	it('aria_label и aria_labelledBy доходят до корня рядом с ролью', async () => {
		const mounted = mount(ProgressLinear, { props: { aria_label: 'Загрузка файла' } })

		wrapper = mounted

		expect(root().getAttribute('aria-label')).toBe('Загрузка файла')
		expect(root().getAttribute('role')).toBe('progressbar')

		await mounted.setProps({ aria_label: undefined, aria_labelledBy: 'caption' })

		expect(root().hasAttribute('aria-label')).toBe(false)
		expect(root().getAttribute('aria-labelledby')).toBe('caption')
	})
})
