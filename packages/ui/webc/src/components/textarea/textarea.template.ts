/**
 * Шаблон Textarea: поле и счётчик под ним, слотов нет. Счётчик — только при
 * `counter`; поле ссылается на него `aria-describedby`, и текст звучит на фокусе
 * поля, а не живым регионом на каждый символ.
 */

import type { ITextarea } from '@soldy-ui/core'
import type { TTextareaOutputs } from './setup.component'
import type { TStateSnapshot } from '@soldy-ui/setup'
import { bind, ownerAttributes, type ITemplate, patch } from '../../adapter'

/** Части поля: поле и счётчик, одни на всё время жизни элемента. */
type TTextareaParts = {
	readonly field: HTMLTextAreaElement
	readonly counter: HTMLElement
}

const parts = new WeakMap<HTMLElement, TTextareaParts>()

/** Выход плагина имён: в типе состояния его нет, и вид значения проверяется здесь. */
function counterText(state: TStateSnapshot): string {
	const text = state['names_counter']

	return typeof text === 'string' ? text : ''
}

export const textareaTemplate: ITemplate<ITextarea, unknown, TTextareaOutputs> = {
	create: (root) => {
		const { ownerDocument } = root
		const field = ownerDocument.createElement('textarea')
		const counter = ownerDocument.createElement('div')

		counter.className = 'so-textarea__counter'

		// Счётчик встаёт под полем с первым `counter` — см. привязку счётчика
		root.appendChild(field)
		parts.set(root, { field, counter })

		return { slots: {}, control: field }
	},

	bindings: [
		// Нативные атрибуты поля фиксированного тега — проводка разметки
		bind(
			['id', 'name', 'rows', 'maxlength', 'placeholder', 'disabled', 'readonly', 'required'],
			({ root, state }) => {
				const field = parts.get(root)?.field

				if (!field) return

				if (state.id === undefined) field.removeAttribute('id')
				else field.id = state.id

				if (state.rows === undefined) field.removeAttribute('rows')
				else field.rows = state.rows

				if (state.maxlength === undefined) field.removeAttribute('maxlength')
				else field.maxLength = state.maxlength

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

		bind(['counter', 'counterAria', 'names_counter'], ({ root, state }) => {
			const own = parts.get(root)

			if (!own) return

			if (state.counter !== true) {
				own.counter.remove()

				return
			}

			const text = counterText(state)

			ownerAttributes(own.counter, state.counterAria)

			patch(own.counter, { textContent: text })
			if (own.counter.parentNode !== root) root.appendChild(own.counter)
		}),
	],
}
