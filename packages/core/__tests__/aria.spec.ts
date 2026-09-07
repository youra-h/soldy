/**
 * `aria` — атрибуты доступности, вычисленные ядром.
 *
 * Механика та же, что у `classes`: ядро считает значение, шаблон раскладывает.
 * DOM здесь не участвует, поэтому всё проверяется без адаптеров.
 */

import { describe, it, expect } from 'vitest'
import { TButton, TControl, TComponentView } from '../src'

describe('TComponentView.aria', () => {
	it('пуст: у визуального слоя самого по себе семантики нет', () => {
		expect(new TComponentView().aria).toEqual({})
	})
})

describe('TControl.aria · aria-disabled', () => {
	it('не ставится на теге с собственным disabled', () => {
		const control = new TControl({ tag: 'button', disabled: true })

		// Нативный disabled сообщает состояние сам, aria-disabled был бы дублем
		expect(control.aria['aria-disabled']).toBeNull()
	})

	it('ставится там, где нативного disabled нет', () => {
		const control = new TControl({ tag: 'div', disabled: true })

		expect(control.aria['aria-disabled']).toBe('true')
	})

	it('исчезает вместе с disabled', () => {
		const control = new TControl({ tag: 'div', disabled: true })

		control.disabled = false

		expect(control.aria['aria-disabled']).toBeNull()
	})

	it('пересчитывается при смене тега', () => {
		const control = new TControl({ tag: 'div', disabled: true })

		expect(control.aria['aria-disabled']).toBe('true')

		control.tag = 'button'

		expect(control.aria['aria-disabled']).toBeNull()
	})
})

describe('TButton.aria · role и tabindex', () => {
	it('на нативной кнопке не добавляет ничего', () => {
		const button = new TButton()

		expect(button.tag).toBe('button')
		expect(button.aria).toEqual({ 'aria-disabled': null })
	})

	it('на другом теге добавляет role и tabindex', () => {
		const button = new TButton({ tag: 'div' })

		// Без role скринридер не назовёт это кнопкой, без tabindex её нельзя
		// сфокусировать — а значит и активировать с клавиатуры
		expect(button.aria.role).toBe('button')
		expect(button.aria.tabindex).toBe('0')
	})

	it('disabled убирает элемент из порядка обхода', () => {
		const button = new TButton({ tag: 'div', disabled: true })

		expect(button.aria.tabindex).toBeNull()
		expect(button.aria['aria-disabled']).toBe('true')
	})

	it('смена тега переключает набор в обе стороны', () => {
		const button = new TButton({ tag: 'span' })

		expect(button.aria.role).toBe('button')

		button.tag = 'button'

		expect(button.aria.role).toBeUndefined()
		expect(button.aria.tabindex).toBeUndefined()
	})
})

describe('aria · контракт границы', () => {
	it('каждое чтение отдаёт новый объект, а не ссылку на состояние', () => {
		const button = new TButton({ tag: 'div' })

		const first = button.aria

		first.role = 'подделка'

		// Иначе потребитель мог бы незаметно испортить состояние компонента
		expect(button.aria.role).toBe('button')
		expect(button.aria).not.toBe(first)
	})
})
