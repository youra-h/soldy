/**
 * Шаблон NumberInput: `leading`, ввод, обёртка у конца числа, кнопки шага и
 * скрытое поле формы. Нажатия кнопок шага ловит плагин на корне, находит их по
 * классам; ввод плагины находят по классу. docs/architecture.md, Layer 8d, «Поле».
 */

import type { INumberInput } from '@soldy-ui/core'
import type { TNumberInputOutputs } from './setup.component'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import { bind, ownerAttributes, type ITemplate, patch } from '../../adapter'
import {
	iconButton,
	syncIconButton,
	type TIconButton,
	type TIconButtonSpec,
} from '../common/icon-button'
import { placeClearButton } from '../common/clear'

type TNumberInputParts = {
	readonly field: HTMLInputElement
	readonly leading: HTMLElement
	readonly trailing: HTMLElement
	readonly stepper: HTMLElement
	readonly decrement: TIconButton
	readonly increment: TIconButton
	readonly hidden: HTMLInputElement
}

type TStepSpec = TIconButtonSpec & {
	/** Заданный слот значка заменяет иконку целиком. */
	readonly slot: string
}

const DECREMENT: TStepSpec = {
	embedded: 'number-input.decrement',
	iconEmbedded: 'number-input.decrement-icon',
	className: 'so-number-input__decrement',
	role: 'minus',
	slot: 'decrement-icon',
}

const INCREMENT: TStepSpec = {
	embedded: 'number-input.increment',
	iconEmbedded: 'number-input.increment-icon',
	className: 'so-number-input__increment',
	role: 'plus',
	slot: 'increment-icon',
}

const parts = new WeakMap<HTMLElement, TNumberInputParts>()

export const numberInputTemplate: ITemplate<INumberInput, unknown, TNumberInputOutputs> = {
	create: (root, { hasSlot }) => {
		const { ownerDocument } = root
		const leading = ownerDocument.createElement('div')
		const field = ownerDocument.createElement('input')
		const trailing = ownerDocument.createElement('div')
		const stepper = ownerDocument.createElement('div')
		const hidden = ownerDocument.createElement('input')
		const decrement = iconButton(ownerDocument, DECREMENT, hasSlot(DECREMENT.slot))
		const increment = iconButton(ownerDocument, INCREMENT, hasSlot(INCREMENT.slot))

		leading.className = 'so-number-input__leading'
		field.type = 'text'
		field.className = 'so-number-input__input'
		field.setAttribute('autocomplete', 'off')
		field.setAttribute('spellcheck', 'false')
		trailing.className = 'so-number-input__trailing'
		stepper.className = 'so-number-input__stepper'
		hidden.type = 'hidden'

		// Кнопки в обёртку до вставки: в документ одной вставкой, собираются один раз
		stepper.append(decrement.button, increment.button)

		// Обёртку у конца числа приносит и `clearable` (`placeClearButton`)
		if (hasSlot('leading')) root.appendChild(leading)

		root.appendChild(field)

		if (hasSlot('clear') || hasSlot('trailing')) root.appendChild(trailing)

		root.append(stepper, hidden)
		parts.set(root, { field, leading, trailing, stepper, decrement, increment, hidden })

		return {
			// `clear` раньше `trailing`: в обёртке он первый при любом порядке разметки
			slots: {
				leading: { mode: 'append', node: leading },
				clear: { mode: 'append', node: trailing },
				trailing: { mode: 'append', node: trailing },
				'decrement-icon': { mode: 'append', node: decrement.button, slot: DEFAULT_SLOT },
				'increment-icon': { mode: 'append', node: increment.button, slot: DEFAULT_SLOT },
			},
			control: field,
		}
	},

	bindings: [
		bind(['id', 'placeholder', 'disabled', 'readonly', 'required'], ({ root, state }) => {
			const field = parts.get(root)?.field

			if (!field) return

			if (state.id === undefined) field.removeAttribute('id')
			else field.id = state.id

			field.placeholder = state.placeholder ?? ''
			field.disabled = state.disabled === true
			field.readOnly = state.readonly === true
			field.required = state.required === true
		}),

		// Слой владельца у узла один: две привязки затёрли бы наборы друг друга
		bind(['inputAttrs', 'aria', 'inputAria'], ({ root, state }) => {
			const field = parts.get(root)?.field

			if (field)
				ownerAttributes(field, { ...state.inputAttrs, ...state.aria, ...state.inputAria })
		}),

		bind('text', ({ root, state }) => {
			const field = parts.get(root)?.field
			const text = state.text ?? ''

			// `text` — буфер правки ядра; запись того же текста сбросила бы каретку и IME
			if (field && field.value !== text) field.value = text
		}),

		bind(['clearable', 'size', 'disabled', 'clearAria'], (ctx) => {
			const own = parts.get(ctx.root)

			if (own) placeClearButton(ctx, 'number-input', own.trailing, own.stepper)
		}),

		bind(['size', 'decrementDisabled', 'incrementDisabled'], ({ root, state }) => {
			const own = parts.get(root)

			if (!own) return

			syncIconButton(own.decrement, state.size, state.decrementDisabled === true)
			syncIconButton(own.increment, state.size, state.incrementDisabled === true)
		}),

		// Одним слоем, как у ввода
		bind(['decrementAria', 'decrementDataset'], ({ root, state }) => {
			const button = parts.get(root)?.decrement.button

			if (button)
				ownerAttributes(button, { ...state.decrementAria, ...state.decrementDataset })
		}),

		bind(['incrementAria', 'incrementDataset'], ({ root, state }) => {
			const button = parts.get(root)?.increment.button

			if (button)
				ownerAttributes(button, { ...state.incrementAria, ...state.incrementDataset })
		}),

		// В форму уходит число строкой («1234.5»), а не текст ввода: `name` у ввода нет
		bind(['name', 'value', 'disabled'], ({ root, state }) => {
			const hidden = parts.get(root)?.hidden

			if (!hidden) return

			const value = state.value === undefined ? '' : String(state.value)

			hidden.name = state.name ?? ''
			hidden.disabled = state.disabled === true

			patch(hidden, { value })
		}),
	],
}
