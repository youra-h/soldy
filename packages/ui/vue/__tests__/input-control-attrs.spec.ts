/**
 * Input, CheckBox и Switch рисуют корень-обёртку и вложенный `<input>`,
 * Textarea — корень-рамку и вложенную `<textarea>`.
 *
 * Наборы ядра у них стоят на разных элементах: `attrs` — атрибуты корня
 * (`dir`), `aria` — на `<input>`. Нативные `disabled`/`required`/`readonly`
 * вложенного `<input>` проводит разметка, как `name`, поэтому ARIA-дублей
 * рядом с ними быть не должно, а на корне нативного `disabled` нет вовсе. То же
 * с состоянием чекбокса: `checked` и `indeterminate` — свойства `<input>`, без
 * `aria-checked`.
 *
 * CheckBox и Switch подписывает обёртка `Label`, поэтому их корень — `span`,
 * а декор скрыт `aria-hidden`: всё внутри `label` входит в имя поля.
 *
 * Что ядро пишет в какой набор, проверяет `core/__tests__/aria.spec.ts`;
 * здесь — что наборы доехали до своих элементов.
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { TCheckBox, TInput, TSwitch, TTextarea } from '@soldy-ui/core'
import { CheckBox, Input, Switch, Textarea } from '@soldy-ui/vue'

/** Контрол с ошибкой: её задают инстансу — в разметке её задаёт поле формы. */
function invalid<T extends { invalid: boolean }>(ctrl: T): T {
	ctrl.invalid = true

	return ctrl
}

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

	/**
	 * Тема красит коробку поля и подпись поля формы по корню: `dataset` — на
	 * корне, а ошибку скринридеру объявляет `<input>`.
	 */
	it('dataset — на корне: data-disabled и data-invalid, aria-invalid — у <input>', () => {
		const ctrl = new TInput({ disabled: true })

		ctrl.invalid = true

		const wrapper = mount(Input, { props: { ctrl } })

		expect(wrapper.attributes('data-disabled')).toBe('true')
		expect(wrapper.attributes('data-invalid')).toBe('true')
		expect(wrapper.find('input').attributes('data-invalid')).toBeUndefined()
		expect(wrapper.find('input').attributes('aria-invalid')).toBe('true')
	})

	/**
	 * `tag` — всегда тег корня: по нему ядро решает, есть ли у корня нативный
	 * `disabled`. Жёсткий `div` в шаблоне сделал бы проп декоративным, и `tag`
	 * у Input разошёлся бы с React.
	 */
	it('корень рисуется по tag, по умолчанию — div', () => {
		expect(mount(Input).element.localName).toBe('div')
		expect(mount(Input, { props: { tag: 'span' } }).element.localName).toBe('span')
	})
})

/**
 * Textarea устроена как Input: корень — рамка поля, `aria` — у вложенной
 * `<textarea>`, у которой `disabled`, `required` и `readonly` нативные.
 */
describe('Textarea', () => {
	it('disabled и required — нативные атрибуты <textarea>, без ARIA-дублей', () => {
		const field = mount(Textarea, { props: { disabled: true, required: true } }).find(
			'textarea',
		)

		expect(field.attributes('disabled')).toBeDefined()
		expect(field.attributes('required')).toBeDefined()
		expect(field.attributes('aria-disabled')).toBeUndefined()
		expect(field.attributes('aria-required')).toBeUndefined()
	})

	it('readonly — нативный атрибут <textarea>, без aria-readonly', () => {
		const field = mount(Textarea, { props: { readonly: true } }).find('textarea')

		expect(field.attributes('readonly')).toBeDefined()
		expect(field.attributes('aria-readonly')).toBeUndefined()
	})

	it('required на readonly-поле дополняется aria-required: браузер его не валидирует', () => {
		const field = mount(Textarea, { props: { required: true, readonly: true } }).find(
			'textarea',
		)

		expect(field.attributes('aria-required')).toBe('true')
	})

	it('на корне нет disabled, dir — на корне, а не на <textarea>', () => {
		const wrapper = mount(Textarea, { props: { disabled: true, direction: 'rtl' } })

		expect(wrapper.attributes('disabled')).toBeUndefined()
		expect(wrapper.attributes('dir')).toBe('rtl')
		expect(wrapper.find('textarea').attributes('dir')).toBeUndefined()
	})

	it('dataset — на корне: data-disabled, data-invalid и data-limit, aria-invalid — у <textarea>', () => {
		const ctrl = invalid(new TTextarea({ disabled: true, value: 'abc', maxlength: 3 }))
		const wrapper = mount(Textarea, { props: { ctrl } })
		const field = wrapper.find('textarea')

		expect(wrapper.attributes('data-disabled')).toBe('true')
		expect(wrapper.attributes('data-invalid')).toBe('true')
		expect(wrapper.attributes('data-limit')).toBe('reached')
		expect(field.attributes('data-invalid')).toBeUndefined()
		expect(field.attributes('data-limit')).toBeUndefined()
		expect(field.attributes('aria-invalid')).toBe('true')
	})

	it('корень рисуется по tag, по умолчанию — div', () => {
		expect(mount(Textarea).element.localName).toBe('div')
		expect(mount(Textarea, { props: { tag: 'span' } }).element.localName).toBe('span')
	})
})

/**
 * CheckBox и Switch устроены одинаково: корень-обёртка, `<input type="checkbox">`
 * и декоративная часть — коробка с отметкой или дорожка с ручкой.
 */
const CHECKABLES = [
	[
		'CheckBox',
		(props: Record<string, unknown>) => mount(CheckBox, { props }),
		'.so-check-box__container',
	],
	['Switch', (props: Record<string, unknown>) => mount(Switch, { props }), '.so-switch__track'],
] as const

describe.each(CHECKABLES)('%s', (_name, render, decor) => {
	/**
	 * Контрол кладут в подпись `Label`, а внутри `label` HTML разрешает только
	 * строчную разметку: `div` там невалиден.
	 */
	it('корень — span по умолчанию, и всё внутри — не div', () => {
		const wrapper = render({})

		expect(wrapper.element.localName).toBe('span')
		expect(wrapper.findAll('div')).toHaveLength(0)
	})

	it('корень рисуется по tag', () => {
		expect(render({ tag: 'div' }).element.localName).toBe('div')
	})

	/**
	 * Имя контролу даёт подпись вокруг, и в него вошёл бы весь текст внутри
	 * `label`, включая слоты иконок и `on`/`off`. Декор из имени убран.
	 */
	it('декор скрыт от скринридера — aria-hidden', () => {
		expect(render({ value: true }).get(decor).attributes('aria-hidden')).toBe('true')
	})

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

	it('dataset — на корне: data-disabled читает тема, а не <input>', () => {
		const wrapper = render({ disabled: true })

		expect(wrapper.attributes('data-disabled')).toBe('true')
		expect(wrapper.find('input').attributes('data-disabled')).toBeUndefined()
	})

	it.each([true, false])('value: %s — нативный checked у <input>, без aria-checked', (value) => {
		const input = render({ value }).find('input')

		expect(input.element.checked).toBe(value)
		expect(input.attributes('aria-checked')).toBeUndefined()
	})

	/**
	 * Атрибут `value` без значения шаблон отдаёт пустой строкой, и булев проп Vue
	 * приводит её к `true`. С унаследованным типом полей, где первым стоит
	 * `String`, строка оставалась строкой и контрол не отмечала.
	 */
	it('value без значения — отмечен', () => {
		expect(render({ value: '' }).find('input').element.checked).toBe(true)
	})
})

describe.each([
	['CheckBox', () => mount(CheckBox, { props: { ctrl: invalid(new TCheckBox()) } })],
	['Switch', () => mount(Switch, { props: { ctrl: invalid(new TSwitch()) } })],
] as const)('%s · ошибка', (_name, render) => {
	it('data-invalid — на корне, aria-invalid — у <input>', () => {
		const wrapper = render()

		expect(wrapper.attributes('data-invalid')).toBe('true')
		expect(wrapper.find('input').attributes('data-invalid')).toBeUndefined()
		expect(wrapper.find('input').attributes('aria-invalid')).toBe('true')
	})
})

describe('CheckBox · indeterminate', () => {
	it('DOM-свойство <input>, а не aria-checked="mixed"', () => {
		const input = mount(CheckBox, { props: { indeterminate: true } }).find('input')

		expect(input.element.indeterminate).toBe(true)
		expect(input.attributes('aria-checked')).toBeUndefined()
	})

	it('смена пропа доходит до свойства в обе стороны', async () => {
		const wrapper = mount(CheckBox)
		const input = wrapper.find('input')

		expect(input.element.indeterminate).toBe(false)

		await wrapper.setProps({ indeterminate: true })
		expect(input.element.indeterminate).toBe(true)

		await wrapper.setProps({ indeterminate: false })
		expect(input.element.indeterminate).toBe(false)
	})
})

describe('Switch · role', () => {
	it('role="switch" на <input>, а не на корне', () => {
		const wrapper = mount(Switch)

		expect(wrapper.find('input').attributes('role')).toBe('switch')
		expect(wrapper.attributes('role')).toBeUndefined()
	})
})
