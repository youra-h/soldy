/**
 * Шаблон Textarea.
 *
 * Корень — сам `<div is="so-textarea">`: классы, `attrs` (`dir`), `dataset`
 * (`data-disabled`, `data-invalid`, `data-limit`) и скрытие раскладывает на
 * него база (`SoldyElement`). Здесь — поле и счётчик под ним; слотов нет.
 *
 * - Поле — `<textarea>`, узел поля корня: на него база переносит статические
 *   атрибуты разметки корня (`autocomplete`), а шаблон кладёт `aria` ядра
 *   (`ownerAttributes`) и нативные `id`, `name`, `rows`, `maxlength`,
 *   `placeholder`, `disabled`, `readonly` и `required` — ARIA-дублей им ядро
 *   не пишет.
 * - Текст поля ведёт ядро: в ядро его несёт плагин ввода, в узел — привязка
 *   `value`, свойством и только если текст разошёлся с узлом. Узел уже держит
 *   набранное, и запись того же текста сбросила бы каретку в конец, а набор
 *   через IME прервала бы. Высоту по тексту пишет в узел плагин автороста.
 * - Счётчик — только при `counter`: строится с первым `counter` и остаётся
 *   за полем. Текст «12 / 200» — выход плагина имён (`names_counter`) по
 *   локали поддерева, набор `counterAria` с `id` счётчика кладёт шаблон: поле
 *   ссылается на него `aria-describedby`, и текст звучит на фокусе поля, а не
 *   живым регионом на каждый символ.
 */

import type { ITextarea } from '@soldy-ui/core'
import type { TStateSnapshot } from '@soldy-ui/setup'
import { bind, ownerAttributes, type ITemplate } from '../../adapter'

/** Части поля: поле и счётчик, одни на всё время жизни элемента. */
type TTextareaParts = {
	readonly field: HTMLTextAreaElement
	readonly counter: HTMLElement
}

const parts = new WeakMap<HTMLElement, TTextareaParts>()

/**
 * Текст счётчика — выход плагина имён. Выходов плагинов в типе состояния
 * элемента нет, и выход читается по имени, как база читает выход плагина
 * раскладки; вид значения проверяется здесь.
 */
function counterText(state: TStateSnapshot): string {
	const text = state['names_counter']

	return typeof text === 'string' ? text : ''
}

export const textareaTemplate: ITemplate<ITextarea> = {
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

			if (own.counter.textContent !== text) own.counter.textContent = text
			if (own.counter.parentNode !== root) root.appendChild(own.counter)
		}),
	],
}
