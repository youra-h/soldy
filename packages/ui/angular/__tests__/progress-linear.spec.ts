/**
 * ProgressLinear под Angular — проводка на настоящей разметке.
 *
 * Долю, `aria-value*`, `data-indeterminate` и модификатор оси считает ядро
 * (`core/__tests__/progress-linear.spec.ts`), переходы и бег рисует тема
 * (`playground/vue/browser/progress-linear.spec.ts`). Здесь важно, что всё это
 * доезжает до разметки: наборы, модификатор и доля — на корне, внутри одна
 * заливка без привязок. Сценарии — те же, что у Vue (`progress-linear.spec.ts`);
 * порядок доли среди стилей корня сторожит `root-attributes.spec.ts`.
 *
 * Корень — сам элемент: `TestBed.createComponent` с `inferTagName` создаёт его
 * по первому селектору (`span[so-progress-linear]`), а входы задаёт
 * `componentRef.setInput()` — как привязка у родителя.
 */

import { describe, it, expect } from 'vitest'
import { Component } from '@angular/core'
import { TestBed, type ComponentFixture } from '@angular/core/testing'
import { TProgressLinear } from '@soldy-ui/core'
import { TProgressLinearComponent } from '@soldy-ui/angular'
import { findIn, mountHost } from './mount'

/** ProgressLinear сам по себе: корень — `<span>`, тег первого селектора. */
function mount(inputs: Record<string, unknown> = {}): ComponentFixture<TProgressLinearComponent> {
	const fixture = TestBed.createComponent(TProgressLinearComponent, { inferTagName: true })

	for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value)

	fixture.detectChanges()

	return fixture
}

/** Задать входы, как это делает привязка у родителя, и перепроверить. */
function update(
	fixture: ComponentFixture<TProgressLinearComponent>,
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
const percent = (node: HTMLElement) => node.style.getPropertyValue('--so-progress-linear-percent')

@Component({
	standalone: true,
	imports: [TProgressLinearComponent],
	template: `<span so-progress-linear [value]="40">текст</span>`,
})
class ContentHost {}

describe('первая отрисовка', () => {
	it('по умолчанию полоса пуста: доля 0, aria-valuenow="0", бега нет, ось горизонтальная', () => {
		const node = root(mount())

		expect(node.localName).toBe('span')
		expect([...node.classList]).toEqual([
			'so-progress-linear',
			'so-progress-linear--size-normal',
			'so-progress-linear--horizontal',
		])
		expect(node.getAttribute('role')).toBe('progressbar')
		expect(node.getAttribute('aria-valuemin')).toBe('0')
		expect(node.getAttribute('aria-valuemax')).toBe('100')
		expect(node.getAttribute('aria-valuenow')).toBe('0')
		expect(node.hasAttribute('aria-orientation')).toBe(false)
		expect(node.dataset['indeterminate']).toBe('false')
		expect(percent(node)).toBe('0%')
	})

	it('флаг из разметки: роль и шкала без aria-valuenow, бег, переменной нет', () => {
		const node = root(mount({ value: 40, indeterminate: true }))

		expect(node.getAttribute('role')).toBe('progressbar')
		expect(node.getAttribute('aria-valuemax')).toBe('100')
		expect(node.hasAttribute('aria-valuenow')).toBe(false)
		expect(node.dataset['indeterminate']).toBe('true')
		expect(percent(node)).toBe('')
		// Пустой стиль-выход атрибута не оставляет
		expect(node.hasAttribute('style')).toBe(false)
	})

	it('доля известна: aria-valuenow, data-indeterminate="false" и переменная на корне', () => {
		const node = root(mount({ value: 40, direction: 'rtl' }))

		expect(node.getAttribute('aria-valuenow')).toBe('40')
		expect(node.dataset['indeterminate']).toBe('false')
		expect(percent(node)).toBe('40%')
		// Бег в RTL тема зеркалит по атрибуту
		expect(node.getAttribute('dir')).toBe('rtl')
	})

	it('вертикальная ось — модификатором на корне, без aria-orientation', () => {
		const node = root(mount({ value: 40, orientation: 'vertical' }))

		expect(node.classList.contains('so-progress-linear--vertical')).toBe(true)
		expect(node.classList.contains('so-progress-linear--horizontal')).toBe(false)
		expect(node.hasAttribute('aria-orientation')).toBe(false)
		expect(percent(node)).toBe('40%')
	})

	it('размер и вариант — модификаторами на корне', () => {
		const node = root(mount({ size: 'lg', variant: 'brand' }))

		expect(node.classList.contains('so-progress-linear--size-lg')).toBe(true)
		expect(node.classList.contains('so-progress-linear--variant-brand')).toBe(true)
	})

	it('внутри — одна заливка: span только с классом, без стиля и слотов', () => {
		const node = findIn(mountHost(ContentHost), '[so-progress-linear]', HTMLElement)
		const children = [...node.children]

		expect(children).toHaveLength(1)
		expect(children[0].localName).toBe('span')
		expect(children[0].getAttributeNames()).toEqual(['class'])
		expect(children[0].className).toBe('so-progress-linear__range')
		// Содержимое роли `progressbar` скринридер не читает — слота нет, и
		// написанное внутри элемента не выводится
		expect(node.textContent).toBe('')
	})
})

describe('смена значения и флага', () => {
	it('флаг поверх значения и обратно: после снятия снова видна доля', () => {
		const fixture = mount({ value: 60 })

		expect(percent(root(fixture))).toBe('60%')

		update(fixture, { indeterminate: true })

		expect(root(fixture).hasAttribute('aria-valuenow')).toBe(false)
		expect(root(fixture).dataset['indeterminate']).toBe('true')
		expect(percent(root(fixture))).toBe('')

		update(fixture, { indeterminate: false })

		expect(root(fixture).getAttribute('aria-valuenow')).toBe('60')
		expect(root(fixture).dataset['indeterminate']).toBe('false')
		expect(percent(root(fixture))).toBe('60%')
	})

	it('снятый из разметки флаг — снова доля: умолчание флага — false', () => {
		const fixture = mount({ value: 30, indeterminate: true })

		expect(root(fixture).dataset['indeterminate']).toBe('true')
		expect(percent(root(fixture))).toBe('')

		update(fixture, { indeterminate: undefined })

		expect(root(fixture).dataset['indeterminate']).toBe('false')
		expect(percent(root(fixture))).toBe('30%')
	})

	it('снятое из разметки значение — пустая полоса: умолчание — 0', () => {
		const fixture = mount({ value: 30 })

		expect(percent(root(fixture))).toBe('30%')

		update(fixture, { value: undefined })

		expect(root(fixture).getAttribute('aria-valuenow')).toBe('0')
		expect(root(fixture).dataset['indeterminate']).toBe('false')
		expect(percent(root(fixture))).toBe('0%')
	})

	it('смена оси меняет модификатор на корне', () => {
		const fixture = mount({ value: 20 })

		update(fixture, { orientation: 'vertical' })

		expect(root(fixture).classList.contains('so-progress-linear--vertical')).toBe(true)
		expect(root(fixture).classList.contains('so-progress-linear--horizontal')).toBe(false)

		update(fixture, { orientation: undefined })

		expect(root(fixture).classList.contains('so-progress-linear--horizontal')).toBe(true)
		expect(root(fixture).classList.contains('so-progress-linear--vertical')).toBe(false)
	})

	it('смена шкалы пересчитывает долю и aria-value*', () => {
		const fixture = mount({ value: 60 })

		update(fixture, { max: 200 })

		expect(percent(root(fixture))).toBe('30%')
		expect(root(fixture).getAttribute('aria-valuemax')).toBe('200')

		update(fixture, { min: 40 })

		expect(percent(root(fixture))).toBe('12.5%')
		expect(root(fixture).getAttribute('aria-valuemin')).toBe('40')
	})

	it('скрытый корень — display: none, доля остаётся на нём', () => {
		const fixture = mount({ value: 40 })

		update(fixture, { visible: false })

		expect(root(fixture).style.display).toBe('none')
		expect(percent(root(fixture))).toBe('40%')

		update(fixture, { visible: undefined })

		expect(root(fixture).style.display).toBe('')
		expect(percent(root(fixture))).toBe('40%')
	})
})

describe('внешний ctrl', () => {
	it('разметка — по его значению, смена у экземпляра доезжает', () => {
		const ctrl = new TProgressLinear({ value: 25 })
		const fixture = mount({ ctrl })

		expect(root(fixture).getAttribute('aria-valuenow')).toBe('25')
		expect(percent(root(fixture))).toBe('25%')

		ctrl.indeterminate = true
		fixture.detectChanges()

		expect(root(fixture).dataset['indeterminate']).toBe('true')
		expect(percent(root(fixture))).toBe('')

		ctrl.value = 90
		ctrl.indeterminate = false
		fixture.detectChanges()

		expect(percent(root(fixture))).toBe('90%')

		ctrl.orientation = 'vertical'
		fixture.detectChanges()

		expect(root(fixture).classList.contains('so-progress-linear--vertical')).toBe(true)
	})

	it('пропсы разметки ложатся поверх ctrl', () => {
		const ctrl = new TProgressLinear({ value: 25 })
		const fixture = mount({ ctrl, max: 50 })

		expect(ctrl.max).toBe(50)
		expect(percent(root(fixture))).toBe('50%')
	})

	it('бег и ось внешнего ctrl переживают монтирование без этих входов', () => {
		const ctrl = new TProgressLinear({
			value: 25,
			indeterminate: true,
			orientation: 'vertical',
		})
		const fixture = mount({ ctrl })

		expect(root(fixture).dataset['indeterminate']).toBe('true')
		expect(root(fixture).classList.contains('so-progress-linear--vertical')).toBe(true)
	})
})

describe('имя', () => {
	it('без aria_label имени нет, а полоса не прячется', () => {
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
