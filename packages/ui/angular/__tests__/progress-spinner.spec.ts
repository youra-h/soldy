/**
 * ProgressSpinner под Angular — проводка на настоящей разметке.
 *
 * Долю, `aria-value*` и `data-indeterminate` считает ядро
 * (`core/__tests__/progress-spinner.spec.ts`), рисунок, переходы и бег — тема
 * (`playground/vue/browser/progress-spinner.spec.ts`). Здесь важно, что всё это
 * доезжает до разметки: наборы и доля — на корне, внутри один рисунок под
 * `aria-hidden` без привязок. Сценарии — те же, что у React
 * (`progress-spinner.spec.tsx`); порядок доли среди стилей корня сторожит
 * `root-attributes.spec.ts`.
 *
 * Корень — сам элемент: `TestBed.createComponent` с `inferTagName` создаёт его
 * по первому селектору (`span[so-progress-spinner]`), а входы задаёт
 * `componentRef.setInput()` — как привязка у родителя.
 */

import { describe, it, expect } from 'vitest'
import { Component } from '@angular/core'
import { TestBed, type ComponentFixture } from '@angular/core/testing'
import { TProgressSpinner } from '@soldy-ui/core'
import { TProgressSpinnerComponent } from '@soldy-ui/angular'
import { findIn, mountHost } from './mount'

/** ProgressSpinner сам по себе: корень — `<span>`, тег первого селектора. */
function mount(inputs: Record<string, unknown> = {}): ComponentFixture<TProgressSpinnerComponent> {
	const fixture = TestBed.createComponent(TProgressSpinnerComponent, { inferTagName: true })

	for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value)

	fixture.detectChanges()

	return fixture
}

/** Задать входы, как это делает привязка у родителя, и перепроверить. */
function update(
	fixture: ComponentFixture<TProgressSpinnerComponent>,
	inputs: Record<string, unknown>,
): void {
	for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value)

	fixture.detectChanges()
}

/** Корень — сам хост-элемент компонента. */
function root(fixture: ComponentFixture<unknown>): HTMLElement {
	const element: HTMLElement = fixture.nativeElement

	return element
}

/** Доля готового на корне; пустая строка — переменной нет. */
const fraction = (node: HTMLElement) =>
	node.style.getPropertyValue('--so-progress-spinner-fraction')

@Component({
	standalone: true,
	imports: [TProgressSpinnerComponent],
	template: `<span so-progress-spinner [value]="40">текст</span>`,
})
class ContentHost {}

describe('первая отрисовка', () => {
	it('по умолчанию кольцо пусто: доля 0, aria-valuenow="0", бега нет', () => {
		const node = root(mount())

		expect(node.localName).toBe('span')
		expect([...node.classList]).toEqual([
			'so-progress-spinner',
			'so-progress-spinner--size-normal',
		])
		expect(node.getAttribute('role')).toBe('progressbar')
		expect(node.getAttribute('aria-valuemin')).toBe('0')
		expect(node.getAttribute('aria-valuemax')).toBe('100')
		expect(node.getAttribute('aria-valuenow')).toBe('0')
		expect(node.hasAttribute('aria-hidden')).toBe(false)
		expect(node.dataset['indeterminate']).toBe('false')
		expect(fraction(node)).toBe('0')
	})

	it('флаг из разметки: роль и шкала без aria-valuenow, бег, переменной нет', () => {
		const node = root(mount({ value: 40, indeterminate: true }))

		expect(node.getAttribute('role')).toBe('progressbar')
		expect(node.getAttribute('aria-valuemax')).toBe('100')
		expect(node.hasAttribute('aria-valuenow')).toBe(false)
		expect(node.dataset['indeterminate']).toBe('true')
		expect(fraction(node)).toBe('')
		// Пустой стиль-выход атрибута не оставляет
		expect(node.hasAttribute('style')).toBe(false)
	})

	it('доля известна: aria-valuenow, data-indeterminate="false" и переменная числом на корне', () => {
		const node = root(mount({ value: 40, direction: 'rtl' }))

		expect(node.getAttribute('aria-valuenow')).toBe('40')
		expect(node.dataset['indeterminate']).toBe('false')
		expect(fraction(node)).toBe('0.4')
		// Кольцо в RTL не зеркалится, но направление письма доходит до корня,
		// как у любого компонента
		expect(node.getAttribute('dir')).toBe('rtl')
	})

	it('размер и вариант — модификаторами на корне', () => {
		const node = root(mount({ size: 'lg', variant: 'brand' }))

		expect([...node.classList]).toEqual([
			'so-progress-spinner',
			'so-progress-spinner--size-lg',
			'so-progress-spinner--variant-brand',
		])
	})

	it('внутри — один рисунок под aria-hidden: дорожка и две дуги без привязок, слотов нет', () => {
		const node = findIn(mountHost(ContentHost), '[so-progress-spinner]', HTMLElement)
		const children = [...node.children]

		expect(children).toHaveLength(1)

		const [ring] = children

		expect(ring.localName).toBe('svg')
		expect(ring.getAttribute('class')).toBe('so-progress-spinner__ring')
		expect(ring.getAttribute('aria-hidden')).toBe('true')
		expect(ring.getAttributeNames().sort()).toEqual(['aria-hidden', 'class', 'viewBox'])
		expect([...ring.children].map((circle) => circle.getAttribute('class'))).toEqual([
			'so-progress-spinner__track',
			'so-progress-spinner__range',
			'so-progress-spinner__runner',
		])
		// Геометрия статична: доля уходит в штрих из переменной корня, а не
		// привязкой на дуге
		expect([...ring.children].map((circle) => circle.getAttributeNames().sort())).toEqual([
			['class', 'cx', 'cy', 'r'],
			['class', 'cx', 'cy', 'pathLength', 'r'],
			['class', 'cx', 'cy', 'pathLength', 'r'],
		])
		// Содержимое роли `progressbar` скринридер не читает — слота нет, и
		// написанное внутри элемента не выводится
		expect(node.textContent).toBe('')
	})
})

describe('смена значения и флага', () => {
	it('флаг поверх значения и обратно: после снятия снова видна доля', () => {
		const fixture = mount({ value: 60 })

		expect(fraction(root(fixture))).toBe('0.6')

		update(fixture, { indeterminate: true })

		expect(root(fixture).hasAttribute('aria-valuenow')).toBe(false)
		expect(root(fixture).dataset['indeterminate']).toBe('true')
		expect(fraction(root(fixture))).toBe('')

		update(fixture, { indeterminate: false })

		expect(root(fixture).getAttribute('aria-valuenow')).toBe('60')
		expect(root(fixture).dataset['indeterminate']).toBe('false')
		expect(fraction(root(fixture))).toBe('0.6')
	})

	it('снятый из разметки флаг — снова доля: умолчание флага — false', () => {
		const fixture = mount({ value: 30, indeterminate: true })

		expect(root(fixture).dataset['indeterminate']).toBe('true')
		expect(fraction(root(fixture))).toBe('')

		update(fixture, { indeterminate: undefined })

		expect(root(fixture).dataset['indeterminate']).toBe('false')
		expect(fraction(root(fixture))).toBe('0.3')
	})

	it('снятое из разметки значение — пустое кольцо: умолчание — 0', () => {
		const fixture = mount({ value: 30 })

		expect(fraction(root(fixture))).toBe('0.3')

		update(fixture, { value: undefined })

		expect(root(fixture).getAttribute('aria-valuenow')).toBe('0')
		expect(root(fixture).dataset['indeterminate']).toBe('false')
		expect(fraction(root(fixture))).toBe('0')
	})

	it('смена шкалы пересчитывает долю и aria-value*', () => {
		const fixture = mount({ value: 60 })

		update(fixture, { max: 200 })

		expect(fraction(root(fixture))).toBe('0.3')
		expect(root(fixture).getAttribute('aria-valuemax')).toBe('200')

		update(fixture, { min: 40 })

		expect(fraction(root(fixture))).toBe('0.125')
		expect(root(fixture).getAttribute('aria-valuemin')).toBe('40')
	})

	it('скрытый корень — display: none, доля остаётся на нём', () => {
		const fixture = mount({ value: 40 })

		update(fixture, { visible: false })

		expect(root(fixture).style.display).toBe('none')
		expect(fraction(root(fixture))).toBe('0.4')

		update(fixture, { visible: undefined })

		expect(root(fixture).style.display).toBe('')
		expect(fraction(root(fixture))).toBe('0.4')
	})
})

describe('внешний ctrl', () => {
	it('разметка — по его значению, смена у экземпляра доезжает', () => {
		const ctrl = new TProgressSpinner({ value: 25 })
		const fixture = mount({ ctrl })

		expect(root(fixture).getAttribute('aria-valuenow')).toBe('25')
		expect(fraction(root(fixture))).toBe('0.25')

		ctrl.indeterminate = true
		fixture.detectChanges()

		expect(root(fixture).dataset['indeterminate']).toBe('true')
		expect(fraction(root(fixture))).toBe('')

		ctrl.value = 90
		ctrl.indeterminate = false
		fixture.detectChanges()

		expect(fraction(root(fixture))).toBe('0.9')
	})

	it('пропсы разметки ложатся поверх ctrl', () => {
		const ctrl = new TProgressSpinner({ value: 25 })
		const fixture = mount({ ctrl, max: 50 })

		expect(ctrl.max).toBe(50)
		expect(fraction(root(fixture))).toBe('0.5')
	})

	it('бег внешнего ctrl переживает монтирование без этого входа', () => {
		const ctrl = new TProgressSpinner({ value: 25, indeterminate: true })
		const fixture = mount({ ctrl })

		expect(root(fixture).dataset['indeterminate']).toBe('true')
		expect(fraction(root(fixture))).toBe('')
	})
})

describe('имя', () => {
	it('без aria_label имени нет, а кольцо не прячется', () => {
		const node = root(mount({ value: 40 }))

		expect(node.hasAttribute('aria-label')).toBe(false)
		expect(node.hasAttribute('aria-hidden')).toBe(false)
	})

	it('aria_label и aria_labelledBy доходят до корня рядом с ролью', () => {
		const fixture = mount({ aria_label: 'Загрузка файла' })

		expect(root(fixture).getAttribute('aria-label')).toBe('Загрузка файла')
		expect(root(fixture).getAttribute('role')).toBe('progressbar')

		update(fixture, { aria_label: undefined, aria_labelledBy: 'caption' })

		expect(root(fixture).hasAttribute('aria-label')).toBe(false)
		expect(root(fixture).getAttribute('aria-labelledby')).toBe('caption')
	})
})
