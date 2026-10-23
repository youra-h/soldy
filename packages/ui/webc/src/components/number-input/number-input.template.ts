/**
 * Шаблон NumberInput.
 *
 * Корень — сам `<div is="so-number-input">`: классы, `attrs` (`dir`),
 * `dataset` (`data-disabled`, `data-invalid`) и скрытие раскладывает на него
 * база (`ElementBase`). Здесь — то же, что в разметке Vue, в том же порядке:
 * обёртка слота `leading`, ввод, обёртка у конца числа, кнопки шага и
 * значение для формы.
 *
 * - Ввод — `<input type="text">` с классом `so-number-input__input`, узел поля
 *   корня: на него база переносит статические атрибуты разметки корня
 *   (`autocomplete`, `aria-label`), а по классу его находят плагины поля —
 *   рядом в корне лежит скрытое поле формы. Нативные `id`, `placeholder`,
 *   `disabled`, `readonly` и `required` — проводка разметки; `name` у ввода
 *   нет — в форму уходит число, а не текст. Ни проверки орфографии, ни
 *   автозаполнения: число — не слово.
 * - Наборы ввода — `inputAttrs` (`dir` и `lang` числа, экранная клавиатура
 *   `inputmode`), `aria` (имя, справка, ошибка) и `inputAria` (роль
 *   `spinbutton` и `aria-value*`). Слой владельца у элемента один
 *   (`ownerAttributes`), поэтому все три кладёт одна привязка, склеенными в
 *   порядке Vue: две привязки затёрли бы набор друг друга.
 * - Текст ввода — буфер правки ядра (`text`), а не `value`: пока набирают,
 *   набранное, после — строка формата. В узел его пишет привязка, свойством и
 *   только если текст разошёлся с узлом: запись того же текста сбросила бы
 *   каретку, а набор через IME прервала бы.
 * - Обёртка у конца числа — при слотах `clear` или `trailing` или при
 *   `clearable`, и встаёт она перед кнопками шага, а не в конец корня, как у
 *   Input. В ней первой — своя кнопка (слот `clear`) или встроенная очистка,
 *   за ней — `trailing`, при любом порядке в разметке. Очистка — как у Input:
 *   деталь `<button is="so-button" embedded="number-input.clear"
 *   type="button">` с иконкой роли `close`, размером поля, выключена вместе с
 *   полем, `readonly` её не гасит; имя — набор поля `clearAria`, очищает
 *   команда поля `clear` — и значение, и набранный текст — по нативному
 *   клику кнопки, гася его всплытие.
 * - Кнопки шага — детали `<button is="so-button" type="button">` в
 *   `so-number-input__stepper`: «меньше» (`number-input.decrement`), затем
 *   «больше» (`number-input.increment`), по классам `so-number-input__decrement`
 *   и `__increment` их находит плагин кнопок. Обработчиков у них нет:
 *   нажатие, удержание и клик скринридера ловит плагин на корне. Размер —
 *   поля, выключенность — у края, у выключенного поля и только для чтения
 *   (`decrementDisabled`, `incrementDisabled`). Набор кнопки — имя от локали и
 *   `tabindex="-1"` (`decrementAria`) и `data-pressed` удержания
 *   (`decrementDataset`) — одной привязкой на оба, по той же причине, что у
 *   ввода. Значок — слот `decrement-icon` или `increment-icon` в слот по
 *   умолчанию кнопки; своя иконка роли `minus` или `plus` ставится только без
 *   слота.
 * - Значение для формы — скрытое поле последним: `name`, `value` — число
 *   строкой («1234.5», а не «1 234,5 ₽»), без числа — пусто, `disabled` —
 *   поля.
 *
 * Пропсы деталей пишутся, только когда сменились: `disabled` кнопки нативный,
 * и каждая запись прошла бы через его атрибут. Вида у кнопок нет: тема красит
 * их по контексту.
 *
 * Scope у слотов нет, как у всех слотов Web Components: значение поля и его
 * команды содержимое слота берёт у элемента (`el.ctrl`).
 */

import type { INumberInput } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import {
	bind,
	createDetail,
	lend,
	ownerAttributes,
	type ITemplate,
	type ITemplateContext,
} from '../../adapter'
import { TButtonElement, type TButtonElementProps } from '../button'
import { TIconElement, type TIconElementProps } from '../icon'

/** Кнопка шага и её иконка; иконки нет, когда задан слот значка. */
type TStepButton = {
	readonly button: TButtonElementProps
	readonly icon: TIconElementProps | null
}

/** Части поля, одни на всё время жизни элемента. */
type TNumberInputParts = {
	readonly field: HTMLInputElement
	readonly leading: HTMLElement
	readonly trailing: HTMLElement
	readonly stepper: HTMLElement
	readonly decrement: TStepButton
	readonly increment: TStepButton
	readonly hidden: HTMLInputElement
}

/** Кнопка очистки и иконка в ней. */
type TClearButton = {
	readonly button: TButtonElementProps
	readonly icon: TIconElementProps
}

/** Как построить кнопку шага: имена мест, класс, роль значка и его слот. */
type TStepSpec = {
	/** Имя места кнопки (`embedded`). */
	readonly embedded: string
	/** Имя места иконки значка. */
	readonly iconEmbedded: string
	/** Класс кнопки: по нему кнопку находит плагин кнопок шага. */
	readonly className: string
	/** Роль иконки значка. */
	readonly role: string
	/** Слот значка: заданный заменяет иконку целиком. */
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

/** Кнопка очистки каждого поля — строится с первым `clearable` и остаётся за ним. */
const clears = new WeakMap<HTMLElement, TClearButton>()

/**
 * Кнопка шага — деталь разметки. Своя иконка — только без слота значка:
 * заданный слот заменяет её целиком, а кнопка с удержанием остаётся своей.
 */
function stepButton(owner: Document, spec: TStepSpec, slotted: boolean): TStepButton {
	const button = createDetail(owner, TButtonElement, {
		embedded: spec.embedded,
		attributes: { type: 'button' },
	})

	button.className = spec.className

	if (slotted) return { button, icon: null }

	const icon = createDetail(owner, TIconElement, { embedded: spec.iconEmbedded })

	icon.icon = spec.role
	lend(button, DEFAULT_SLOT, icon)

	return { button, icon }
}

/** Пропсы кнопки шага и её иконки — только сменившиеся (см. шапку). */
function syncStep(step: TStepButton, size: TButtonElementProps['size'], disabled: boolean): void {
	const { button, icon } = step

	if (button.size !== size) button.size = size
	if (button.disabled !== disabled) button.disabled = disabled
	if (icon && icon.size !== size) icon.size = size
}

/**
 * Кнопка очистки поля — деталь его разметки. Нажатие — команда поля `clear`
 * того инстанса, что живёт сейчас: контекст шаблона отдаёт его в момент
 * обращения.
 */
function clearOf(ctx: ITemplateContext<INumberInput>): TClearButton {
	const known = clears.get(ctx.root)

	if (known) return known

	const { ownerDocument } = ctx.root
	const button = createDetail(ownerDocument, TButtonElement, {
		embedded: 'number-input.clear',
		attributes: { type: 'button' },
	})
	const icon = createDetail(ownerDocument, TIconElement, { embedded: 'number-input.clear-icon' })

	button.className = 'so-number-input__clear'
	icon.icon = 'close'
	button.appendChild(icon)

	button.addEventListener('so:action:click', (event) => {
		// Клик — нативный: всплытие гасится у самого события, до предков он не дойдёт
		if (event instanceof CustomEvent && event.detail instanceof Event) {
			event.detail.stopPropagation()
		}

		ctx.ctrl?.clear()
	})

	const clear = { button, icon }

	clears.set(ctx.root, clear)

	return clear
}

export const numberInputTemplate: ITemplate<INumberInput> = {
	create: (root, { hasSlot }) => {
		const { ownerDocument } = root
		const leading = ownerDocument.createElement('div')
		const field = ownerDocument.createElement('input')
		const trailing = ownerDocument.createElement('div')
		const stepper = ownerDocument.createElement('div')
		const hidden = ownerDocument.createElement('input')
		const decrement = stepButton(ownerDocument, DECREMENT, hasSlot(DECREMENT.slot))
		const increment = stepButton(ownerDocument, INCREMENT, hasSlot(INCREMENT.slot))

		leading.className = 'so-number-input__leading'
		field.type = 'text'
		field.className = 'so-number-input__input'
		field.setAttribute('autocomplete', 'off')
		field.setAttribute('spellcheck', 'false')
		trailing.className = 'so-number-input__trailing'
		stepper.className = 'so-number-input__stepper'
		hidden.type = 'hidden'

		// Сначала кнопки в обёртку, потом обёртка в корень: кнопки входят в
		// документ одной вставкой и собираются по одному разу
		stepper.append(decrement.button, increment.button)

		// Обёртка — только когда в неё есть что положить; у конца числа её
		// приносит и `clearable` — см. привязку кнопки очистки
		if (hasSlot('leading')) root.appendChild(leading)

		root.appendChild(field)

		if (hasSlot('clear') || hasSlot('trailing')) root.appendChild(trailing)

		root.append(stepper, hidden)
		parts.set(root, { field, leading, trailing, stepper, decrement, increment, hidden })

		return {
			// `clear` объявлен раньше `trailing`: в обёртке у конца числа он первый.
			// Значки — в слот по умолчанию своей кнопки шага
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
		// Нативные атрибуты ввода фиксированного тега — проводка разметки
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

		// Наборы ввода — одним слоем владельца, в порядке Vue (см. шапку)
		bind(['inputAttrs', 'aria', 'inputAria'], ({ root, state }) => {
			const field = parts.get(root)?.field

			if (field)
				ownerAttributes(field, { ...state.inputAttrs, ...state.aria, ...state.inputAria })
		}),

		bind('text', ({ root, state }) => {
			const field = parts.get(root)?.field
			const text = state.text ?? ''

			// Только если текст разошёлся с узлом: каретка остаётся на месте
			if (field && field.value !== text) field.value = text
		}),

		bind(['clearable', 'size', 'disabled', 'clearAria'], (ctx) => {
			const { root, state, hasSlot } = ctx
			const own = parts.get(root)

			// Своя кнопка — слот `clear`: заменяет встроенную целиком
			if (!own || hasSlot('clear')) return

			if (state.clearable !== true) {
				clears.get(root)?.button.remove()

				// Обёртку у конца числа держала только кнопка
				if (!hasSlot('trailing')) own.trailing.remove()

				return
			}

			const { button, icon } = clearOf(ctx)
			const disabled = state.disabled === true

			if (button.size !== state.size) button.size = state.size
			if (button.disabled !== disabled) button.disabled = disabled
			if (icon.size !== state.size) icon.size = state.size

			ownerAttributes(button, state.clearAria)

			// Сначала кнопка в обёртку, потом обёртка в корень — перед кнопками
			// шага: кнопка входит в документ одной вставкой и собирается один раз
			if (own.trailing.firstChild !== button) own.trailing.prepend(button)
			if (own.trailing.parentNode !== root) root.insertBefore(own.trailing, own.stepper)
		}),

		bind(['size', 'decrementDisabled', 'incrementDisabled'], ({ root, state }) => {
			const own = parts.get(root)

			if (!own) return

			syncStep(own.decrement, state.size, state.decrementDisabled === true)
			syncStep(own.increment, state.size, state.incrementDisabled === true)
		}),

		// Набор кнопки шага — одним слоем владельца на оба её набора (см. шапку)
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

		// Значение для формы — число строкой, без числа — пусто
		bind(['name', 'value', 'disabled'], ({ root, state }) => {
			const hidden = parts.get(root)?.hidden

			if (!hidden) return

			const value = state.value === undefined ? '' : String(state.value)

			hidden.name = state.name ?? ''
			hidden.disabled = state.disabled === true

			if (hidden.value !== value) hidden.value = value
		}),
	],
}
