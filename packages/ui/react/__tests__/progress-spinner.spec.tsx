/**
 * ProgressSpinner в React — проводка на настоящей разметке.
 *
 * Долю, `aria-value*` и `data-indeterminate` считает ядро
 * (`core/__tests__/progress-spinner.spec.ts`), рисунок, переходы и бег — тема
 * (`playground/vue/browser/progress-spinner.spec.ts`). Здесь важно, что всё это
 * доезжает до разметки: наборы и доля — на корне, внутри один рисунок под
 * `aria-hidden` без привязок. Сценарии — те же, что у Vue
 * (`progress-spinner.spec.ts`); порядок доли среди стилей корня сторожит
 * `root-attributes.spec.tsx`.
 */

import { describe, it, expect } from 'vitest'
import { act } from 'react'
import { TProgressSpinner } from '@soldy-ui/core'
import { ProgressSpinner } from '@soldy-ui/react'
import { mount } from './mount'

/** Доля готового на корне; пустая строка — переменной нет. */
const fraction = (root: HTMLElement) => root.style.getPropertyValue('--s-progress-spinner-fraction')

describe('первая отрисовка', () => {
	it('по умолчанию кольцо пусто: доля 0, aria-valuenow="0", бега нет', () => {
		const node = mount(<ProgressSpinner />).root()

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
		expect(fraction(node)).toBe('0')
	})

	it('флаг из разметки: роль и шкала без aria-valuenow, бег, переменной нет', () => {
		const node = mount(<ProgressSpinner value={40} indeterminate />).root()

		expect(node.getAttribute('role')).toBe('progressbar')
		expect(node.getAttribute('aria-valuemax')).toBe('100')
		expect(node.hasAttribute('aria-valuenow')).toBe(false)
		expect(node.dataset.indeterminate).toBe('true')
		expect(fraction(node)).toBe('')
		// Пустой стиль-выход атрибута не оставляет
		expect(node.hasAttribute('style')).toBe(false)
	})

	it('доля известна: aria-valuenow, data-indeterminate="false" и переменная числом на корне', () => {
		const node = mount(<ProgressSpinner value={40} direction="rtl" />).root()

		expect(node.getAttribute('aria-valuenow')).toBe('40')
		expect(node.dataset.indeterminate).toBe('false')
		expect(fraction(node)).toBe('0.4')
		// Кольцо в RTL не зеркалится, но направление письма доходит до корня,
		// как у любого компонента
		expect(node.getAttribute('dir')).toBe('rtl')
	})

	it('размер и вариант — модификаторами на корне', () => {
		const node = mount(<ProgressSpinner size="lg" variant="brand" />).root()

		expect([...node.classList]).toEqual([
			's-progress-spinner',
			's-progress-spinner--size-lg',
			's-progress-spinner--variant-brand',
		])
	})

	it('внутри — один рисунок под aria-hidden: дорожка и две дуги без привязок, слотов нет', () => {
		const node = mount(<ProgressSpinner value={40}>текст</ProgressSpinner>).root()

		const children = [...node.children]

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
		expect(node.textContent).toBe('')
	})
})

describe('смена значения и флага', () => {
	it('флаг поверх значения и обратно: после снятия снова видна доля', () => {
		const { root, render } = mount(<ProgressSpinner value={60} />)

		expect(fraction(root())).toBe('0.6')

		render(<ProgressSpinner value={60} indeterminate />)

		expect(root().hasAttribute('aria-valuenow')).toBe(false)
		expect(root().dataset.indeterminate).toBe('true')
		expect(fraction(root())).toBe('')

		render(<ProgressSpinner value={60} indeterminate={false} />)

		expect(root().getAttribute('aria-valuenow')).toBe('60')
		expect(root().dataset.indeterminate).toBe('false')
		expect(fraction(root())).toBe('0.6')
	})

	it('снятый из разметки флаг — снова доля: умолчание флага — false', () => {
		const { root, render } = mount(<ProgressSpinner value={30} indeterminate />)

		expect(root().dataset.indeterminate).toBe('true')
		expect(fraction(root())).toBe('')

		render(<ProgressSpinner value={30} />)

		expect(root().dataset.indeterminate).toBe('false')
		expect(fraction(root())).toBe('0.3')
	})

	it('снятое из разметки значение — пустое кольцо: умолчание — 0', () => {
		const { root, render } = mount(<ProgressSpinner value={30} />)

		expect(fraction(root())).toBe('0.3')

		render(<ProgressSpinner />)

		expect(root().getAttribute('aria-valuenow')).toBe('0')
		expect(root().dataset.indeterminate).toBe('false')
		expect(fraction(root())).toBe('0')
	})

	it('смена шкалы пересчитывает долю и aria-value*', () => {
		const { root, render } = mount(<ProgressSpinner value={60} />)

		render(<ProgressSpinner value={60} max={200} />)

		expect(fraction(root())).toBe('0.3')
		expect(root().getAttribute('aria-valuemax')).toBe('200')

		render(<ProgressSpinner value={60} max={200} min={40} />)

		expect(fraction(root())).toBe('0.125')
		expect(root().getAttribute('aria-valuemin')).toBe('40')
	})

	it('скрытый корень — display: none, доля остаётся на нём', () => {
		const { root, render } = mount(<ProgressSpinner value={40} />)

		render(<ProgressSpinner value={40} visible={false} />)

		expect(root().style.display).toBe('none')
		expect(fraction(root())).toBe('0.4')

		render(<ProgressSpinner value={40} />)

		expect(root().style.display).toBe('')
	})
})

describe('внешний ctrl', () => {
	it('разметка — по его значению, смена у экземпляра доезжает', () => {
		const ctrl = new TProgressSpinner({ value: 25 })
		const { root } = mount(<ProgressSpinner ctrl={ctrl} />)

		expect(root().getAttribute('aria-valuenow')).toBe('25')
		expect(fraction(root())).toBe('0.25')

		act(() => {
			ctrl.indeterminate = true
		})

		expect(root().dataset.indeterminate).toBe('true')
		expect(fraction(root())).toBe('')

		act(() => {
			ctrl.value = 90
			ctrl.indeterminate = false
		})

		expect(fraction(root())).toBe('0.9')
	})

	it('пропсы разметки ложатся поверх ctrl', () => {
		const ctrl = new TProgressSpinner({ value: 25 })
		const { root } = mount(<ProgressSpinner ctrl={ctrl} max={50} />)

		expect(ctrl.max).toBe(50)
		expect(fraction(root())).toBe('0.5')
	})

	it('бег внешнего ctrl переживает монтирование без этого пропа', () => {
		const ctrl = new TProgressSpinner({ value: 25, indeterminate: true })
		const { root } = mount(<ProgressSpinner ctrl={ctrl} />)

		expect(root().dataset.indeterminate).toBe('true')
		expect(fraction(root())).toBe('')
	})
})

describe('имя', () => {
	it('без aria_label имени нет, а кольцо не прячется', () => {
		const node = mount(<ProgressSpinner value={40} />).root()

		expect(node.hasAttribute('aria-label')).toBe(false)
		expect(node.hasAttribute('aria-hidden')).toBe(false)
	})

	it('aria_label и aria_labelledBy доходят до корня рядом с ролью', () => {
		const { root, render } = mount(<ProgressSpinner aria_label="Загрузка файла" />)

		expect(root().getAttribute('aria-label')).toBe('Загрузка файла')
		expect(root().getAttribute('role')).toBe('progressbar')

		render(<ProgressSpinner aria_labelledBy="caption" />)

		expect(root().hasAttribute('aria-label')).toBe(false)
		expect(root().getAttribute('aria-labelledby')).toBe('caption')
	})
})
