/**
 * ProgressSpinner во Vue — проводка на настоящей разметке.
 *
 * Долю, `aria-value*` и `data-indeterminate` считает ядро
 * (`core/__tests__/progress-spinner.spec.ts`), рисунок, переходы и бег — тема
 * (`playground/vue/browser/progress-spinner.spec.ts`). Здесь важно, что всё это
 * доезжает до разметки: наборы и доля — на корне, внутри один рисунок под
 * `aria-hidden` без привязок.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick, ref } from 'vue'
import { TProgressSpinner } from '@soldy-ui/core'
import { ProgressSpinner } from '@soldy-ui/vue'

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
})

/** Корень кольца; нет его — тест падает здесь, а не на чтении атрибута. */
function root(): HTMLElement {
	const element = wrapper?.element

	if (!(element instanceof HTMLElement)) throw new Error('корня кольца нет')

	return element
}

/** Доля готового на корне; пустая строка — переменной нет. */
const fraction = () => root().style.getPropertyValue('--s-progress-spinner-fraction')

describe('первая отрисовка', () => {
	it('по умолчанию кольцо пусто: доля 0, aria-valuenow="0", бега нет', () => {
		wrapper = mount(ProgressSpinner)

		const node = root()

		expect(node.localName).toBe('span')
		expect([...node.classList]).toEqual([
			's-progress-spinner',
			's-progress-spinner--size-normal',
		])
		expect(node.getAttribute('role')).toBe('progressbar')
		expect(node.getAttribute('aria-valuemin')).toBe('0')
		expect(node.getAttribute('aria-valuemax')).toBe('100')
		expect(node.getAttribute('aria-valuenow')).toBe('0')
		expect(node.hasAttribute('aria-hidden')).toBe(false)
		expect(node.dataset.indeterminate).toBe('false')
		expect(fraction()).toBe('0')
	})

	it('флаг из разметки: роль и шкала без aria-valuenow, бег, переменной нет', () => {
		wrapper = mount(ProgressSpinner, { props: { value: 40, indeterminate: true } })

		const node = root()

		expect(node.getAttribute('role')).toBe('progressbar')
		expect(node.getAttribute('aria-valuemax')).toBe('100')
		expect(node.hasAttribute('aria-valuenow')).toBe(false)
		expect(node.dataset.indeterminate).toBe('true')
		expect(fraction()).toBe('')
	})

	it('доля известна: aria-valuenow, data-indeterminate="false" и переменная числом на корне', () => {
		wrapper = mount(ProgressSpinner, { props: { value: 40, direction: 'rtl' } })

		const node = root()

		expect(node.getAttribute('aria-valuenow')).toBe('40')
		expect(node.dataset.indeterminate).toBe('false')
		expect(fraction()).toBe('0.4')
		// Кольцо в RTL не зеркалится, но направление письма доходит до корня,
		// как у любого компонента
		expect(node.getAttribute('dir')).toBe('rtl')
	})

	it('размер и вариант — модификаторами на корне', () => {
		wrapper = mount(ProgressSpinner, { props: { size: 'lg', variant: 'brand' } })

		expect([...root().classList]).toEqual([
			's-progress-spinner',
			's-progress-spinner--size-lg',
			's-progress-spinner--variant-brand',
		])
	})

	it('внутри — один рисунок под aria-hidden: дорожка и две дуги без привязок, слотов нет', () => {
		wrapper = mount(ProgressSpinner, {
			props: { value: 40 },
			slots: { default: () => 'текст' },
		})

		const children = [...root().children]

		expect(children).toHaveLength(1)

		const [ring] = children

		expect(ring.localName).toBe('svg')
		expect(ring.getAttribute('class')).toBe('s-progress-spinner__ring')
		expect(ring.getAttribute('aria-hidden')).toBe('true')
		expect(ring.getAttributeNames().sort()).toEqual(['aria-hidden', 'class', 'viewBox'])
		expect([...ring.children].map((circle) => circle.getAttribute('class'))).toEqual([
			's-progress-spinner__track',
			's-progress-spinner__range',
			's-progress-spinner__runner',
		])
		// Геометрия статична: доля уходит в штрих из переменной корня, а не
		// привязкой на дуге
		expect([...ring.children].map((circle) => circle.getAttributeNames().sort())).toEqual([
			['class', 'cx', 'cy', 'r'],
			['class', 'cx', 'cy', 'pathLength', 'r'],
			['class', 'cx', 'cy', 'pathLength', 'r'],
		])
		// Содержимое роли `progressbar` скринридер не читает — слота нет
		expect(root().textContent).toBe('')
	})
})

describe('смена значения и флага', () => {
	it('флаг поверх значения и обратно: после снятия снова видна доля', async () => {
		const mounted = mount(ProgressSpinner, { props: { value: 60 } })

		wrapper = mounted

		expect(fraction()).toBe('0.6')

		await mounted.setProps({ indeterminate: true })

		expect(root().hasAttribute('aria-valuenow')).toBe(false)
		expect(root().dataset.indeterminate).toBe('true')
		expect(fraction()).toBe('')

		await mounted.setProps({ indeterminate: false })

		expect(root().getAttribute('aria-valuenow')).toBe('60')
		expect(root().dataset.indeterminate).toBe('false')
		expect(fraction()).toBe('0.6')
	})

	it('снятый из разметки флаг — снова доля: умолчание флага — false', async () => {
		const running = ref(true)

		wrapper = mount({
			render: () =>
				h(
					ProgressSpinner,
					running.value ? { value: 30, indeterminate: true } : { value: 30 },
				),
		})

		expect(root().dataset.indeterminate).toBe('true')
		expect(fraction()).toBe('')

		running.value = false
		await nextTick()

		expect(root().dataset.indeterminate).toBe('false')
		expect(fraction()).toBe('0.3')
	})

	it('снятое из разметки значение — пустое кольцо: умолчание — 0', async () => {
		const shown = ref(true)

		wrapper = mount({
			render: () => h(ProgressSpinner, shown.value ? { value: 30 } : {}),
		})

		expect(fraction()).toBe('0.3')

		shown.value = false
		await nextTick()

		expect(root().getAttribute('aria-valuenow')).toBe('0')
		expect(root().dataset.indeterminate).toBe('false')
		expect(fraction()).toBe('0')
	})

	it('смена шкалы пересчитывает долю и aria-value*', async () => {
		const mounted = mount(ProgressSpinner, { props: { value: 60 } })

		wrapper = mounted

		await mounted.setProps({ max: 200 })

		expect(fraction()).toBe('0.3')
		expect(root().getAttribute('aria-valuemax')).toBe('200')

		await mounted.setProps({ min: 40 })

		expect(fraction()).toBe('0.125')
		expect(root().getAttribute('aria-valuemin')).toBe('40')
	})
})

describe('внешний ctrl', () => {
	it('разметка — по его значению, смена у экземпляра доезжает', async () => {
		const ctrl = new TProgressSpinner({ value: 25 })

		wrapper = mount(ProgressSpinner, { props: { ctrl } })

		expect(root().getAttribute('aria-valuenow')).toBe('25')
		expect(fraction()).toBe('0.25')

		ctrl.indeterminate = true
		await nextTick()

		expect(root().dataset.indeterminate).toBe('true')
		expect(fraction()).toBe('')

		ctrl.value = 90
		ctrl.indeterminate = false
		await nextTick()

		expect(fraction()).toBe('0.9')
	})

	it('пропсы разметки ложатся поверх ctrl', () => {
		const ctrl = new TProgressSpinner({ value: 25 })

		wrapper = mount(ProgressSpinner, { props: { ctrl, max: 50 } })

		expect(ctrl.max).toBe(50)
		expect(fraction()).toBe('0.5')
	})

	it('бег внешнего ctrl переживает монтирование без этого пропа', () => {
		const ctrl = new TProgressSpinner({ value: 25, indeterminate: true })

		wrapper = mount(ProgressSpinner, { props: { ctrl } })

		expect(root().dataset.indeterminate).toBe('true')
		expect(fraction()).toBe('')
	})
})

describe('имя', () => {
	it('без aria_label имени нет, а кольцо не прячется', () => {
		wrapper = mount(ProgressSpinner, { props: { value: 40 } })

		expect(root().hasAttribute('aria-label')).toBe(false)
		expect(root().hasAttribute('aria-hidden')).toBe(false)
	})

	it('aria_label и aria_labelledBy доходят до корня рядом с ролью', async () => {
		const mounted = mount(ProgressSpinner, { props: { aria_label: 'Загрузка файла' } })

		wrapper = mounted

		expect(root().getAttribute('aria-label')).toBe('Загрузка файла')
		expect(root().getAttribute('role')).toBe('progressbar')

		await mounted.setProps({ aria_label: undefined, aria_labelledBy: 'caption' })

		expect(root().hasAttribute('aria-label')).toBe(false)
		expect(root().getAttribute('aria-labelledby')).toBe('caption')
	})
})
