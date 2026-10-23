/**
 * Шаблон радио: нативный `<input type="radio">` (поле корня), кольцо с точкой
 * и текст подписи. Группировку по `name`, стрелки, Tab и форму даёт браузер.
 * docs/architecture.md, Layer 8d, «Коллекция».
 */

import type { IRadioGroupItem, TRadioGroupItemCollectionFacade } from '@soldy-ui/core'
import { bind, ownerAttributes, type ITemplate } from '../../../adapter'

const fields = new WeakMap<HTMLElement, HTMLInputElement>()

function attribute(field: HTMLInputElement, name: string, value: unknown): void {
	if (value === undefined || value === null) field.removeAttribute(name)
	else field.setAttribute(name, String(value))
}

export const radioGroupItemTemplate: ITemplate<IRadioGroupItem, TRadioGroupItemCollectionFacade> = {
	create: (root, ctx) => {
		const { ownerDocument } = root
		const field = ownerDocument.createElement('input')
		const control = ownerDocument.createElement('span')
		const indicator = ownerDocument.createElement('span')
		const text = ownerDocument.createElement('span')

		field.className = 'so-radio-group-item__input'
		field.type = 'radio'
		control.className = 'so-radio-group-item__control'
		indicator.className = 'so-radio-group-item__indicator'
		text.className = 'so-radio-group-item__text'
		control.appendChild(indicator)
		// Поле перед кольцом: кольцо фокуса тема рисует соседним селектором от поля
		root.append(field, control, text)
		fields.set(root, field)

		// Плагина ввода у радио нет, выбор в коллекцию несёт `change`; отказ
		// коллекции к полю возвращает `TRadioGroupCheckedPlugin`
		field.addEventListener('change', () => {
			const context = ctx.facade?.context

			if (context) context.adapters.activation.active = true
		})

		return {
			slots: { default: { mode: 'append', node: text } },
			control: field,
		}
	},

	bindings: [
		bind(['name', 'value', 'disabled'], ({ root, state }) => {
			const field = fields.get(root)

			if (!field) return

			attribute(field, 'name', state.name)
			attribute(field, 'value', state.value)
			field.disabled = state.disabled === true
		}),

		bind('aria', ({ root, state }) => {
			const field = fields.get(root)

			if (field) ownerAttributes(field, state.aria)
		}),

		bind('active', ({ root, state }) => {
			const field = fields.get(root)
			const checked = state.active === true

			// После клика браузер уже отметил радио сам
			if (field && field.checked !== checked) field.checked = checked
		}),
	],
}
