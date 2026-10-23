/**
 * Шаблон Input: поле и обёртки слотов по сторонам — только когда в них есть что
 * положить. Кнопка очистки — деталь (docs/architecture.md, Layer 8d, «Деталь
 * разметки»); `readonly` её не гасит: select-only Select — `readonly`, а
 * очистка там работает. Её клик не всплывает: Select открывает панель по клику поля.
 */

import type { IInput } from '@soldy-ui/core'
import { bind, ownerAttributes, type ITemplate } from '../../adapter'
import { placeClearButton } from '../common/clear'

type TInputParts = {
	readonly field: HTMLInputElement
	readonly leading: HTMLElement
	readonly trailing: HTMLElement
}

const parts = new WeakMap<HTMLElement, TInputParts>()

export const inputTemplate: ITemplate<IInput> = {
	create: (root, { hasSlot }) => {
		const { ownerDocument } = root
		const leading = ownerDocument.createElement('div')
		const field = ownerDocument.createElement('input')
		const trailing = ownerDocument.createElement('div')

		leading.className = 'so-input__leading'
		field.type = 'text'
		trailing.className = 'so-input__trailing'

		// Обёртка — только когда в неё есть что положить; у конца поля её
		// приносит и `clearable` — см. привязку кнопки
		if (hasSlot('leading')) root.appendChild(leading)

		root.appendChild(field)

		if (hasSlot('clear') || hasSlot('trailing')) root.appendChild(trailing)

		parts.set(root, { field, leading, trailing })

		return {
			// `clear` объявлен раньше `trailing`: в обёртке у конца поля он первый
			slots: {
				leading: { mode: 'append', node: leading },
				clear: { mode: 'append', node: trailing },
				trailing: { mode: 'append', node: trailing },
			},
			control: field,
		}
	},

	bindings: [
		// Нативные атрибуты поля фиксированного тега — проводка разметки
		bind(
			['id', 'name', 'placeholder', 'disabled', 'readonly', 'required'],
			({ root, state }) => {
				const field = parts.get(root)?.field

				if (!field) return

				if (state.id === undefined) field.removeAttribute('id')
				else field.id = state.id

				field.name = state.name ?? ''
				field.placeholder = state.placeholder ?? ''
				field.disabled = state.disabled === true
				field.readOnly = state.readonly === true
				field.required = state.required === true
			},
		),

		bind('aria', ({ root, state }) => {
			const field = parts.get(root)?.field

			if (field) ownerAttributes(field, state.aria)
		}),

		bind('value', ({ root, state }) => {
			const field = parts.get(root)?.field
			const text = state.value ?? ''

			// Только если текст разошёлся с узлом: каретка остаётся на месте
			if (field && field.value !== text) field.value = text
		}),

		bind(['clearable', 'size', 'disabled', 'clearAria'], (ctx) => {
			const own = parts.get(ctx.root)

			if (own) placeClearButton(ctx, 'input', own.trailing, null)
		}),
	],
}
