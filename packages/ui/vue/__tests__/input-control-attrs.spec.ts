/**
 * Input, CheckBox и Switch рисуют корень-обёртку и вложенный `<input>`.
 *
 * Наборы ядра у них стоят на разных элементах: `attrs` — атрибуты корня
 * (`dir`), `aria` — на `<input>`. Нативные `disabled`/`required`/`readonly`
 * вложенного `<input>` проводит разметка, как `name`, поэтому ARIA-дублей
 * рядом с ними быть не должно, а на корне нативного `disabled` нет вовсе.
 *
 * Что ядро пишет в какой набор, проверяет `core/__tests__/aria.spec.ts`;
 * здесь — что наборы доехали до своих элементов.
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { CheckBox, Input, Switch } from '@soldy/ui-vue'

describe('Input', () => {
	it('disabled и required — нативные атрибуты <input>, без ARIA-дублей', () => {
		const input = mount(Input, { props: { disabled: true, required: true } }).find('input')

		expect(input.attributes('disabled')).toBeDefined()
		expect(input.attributes('required')).toBeDefined()
		expect(input.attributes('aria-disabled')).toBeUndefined()
		expect(input.attributes('aria-required')).toBeUndefined()
	})

	it('readonly — нативный атрибут <input>, без aria-readonly', () => {
		const input = mount(Input, { props: { readonly: true } }).find('input')

		expect(input.attributes('readonly')).toBeDefined()
		expect(input.attributes('aria-readonly')).toBeUndefined()
	})

	it('required на readonly-поле дополняется aria-required: браузер его не валидирует', () => {
		const input = mount(Input, { props: { required: true, readonly: true } }).find('input')

		expect(input.attributes('required')).toBeDefined()
		expect(input.attributes('readonly')).toBeDefined()
		expect(input.attributes('aria-required')).toBe('true')
		expect(input.attributes('aria-readonly')).toBeUndefined()
	})

	it('на корне нет disabled — у обёртки такого атрибута нет', () => {
		expect(mount(Input, { props: { disabled: true } }).attributes('disabled')).toBeUndefined()
	})

	it('direction: rtl — dir на корне, а не на <input>', () => {
		const wrapper = mount(Input, { props: { direction: 'rtl' } })

		expect(wrapper.attributes('dir')).toBe('rtl')
		expect(wrapper.find('input').attributes('dir')).toBeUndefined()
	})
})

/** CheckBox и Switch устроены одинаково: корень-обёртка и `<input type="checkbox">`. */
const CHECKABLES = [
	['CheckBox', (props: Record<string, unknown>) => mount(CheckBox, { props })],
	['Switch', (props: Record<string, unknown>) => mount(Switch, { props })],
] as const

describe.each(CHECKABLES)('%s', (_name, render) => {
	it('disabled и required — нативные атрибуты <input>, без ARIA-дублей', () => {
		const input = render({ disabled: true, required: true }).find('input')

		expect(input.attributes('disabled')).toBeDefined()
		expect(input.attributes('required')).toBeDefined()
		expect(input.attributes('aria-disabled')).toBeUndefined()
		expect(input.attributes('aria-required')).toBeUndefined()
	})

	it('readonly — aria-readonly на <input>: HTML не знает readonly у чекбокса', () => {
		const input = render({ readonly: true }).find('input')

		expect(input.attributes('aria-readonly')).toBe('true')
		expect(input.attributes('readonly')).toBeUndefined()
	})

	it('на корне нет disabled — у обёртки такого атрибута нет', () => {
		expect(render({ disabled: true }).attributes('disabled')).toBeUndefined()
	})

	it('direction: rtl — dir на корне, а не на <input>', () => {
		const wrapper = render({ direction: 'rtl' })

		expect(wrapper.attributes('dir')).toBe('rtl')
		expect(wrapper.find('input').attributes('dir')).toBeUndefined()
	})

	it('aria_label доходит до <input>', () => {
		const input = render({ aria_label: 'Согласие' }).find('input')

		expect(input.attributes('aria-label')).toBe('Согласие')
	})
})
