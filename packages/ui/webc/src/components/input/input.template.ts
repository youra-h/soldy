/**
 * Шаблон Input.
 *
 * Корень — сам `<div is="so-input">`: классы, `attrs` (`dir`) и скрытие
 * раскладывает на него база (`ElementBase`). Здесь — поле и обёртки слотов
 * по его сторонам: `<input>` детей не имеет.
 *
 * - Поле — `<input type="text">`, узел поля корня: на него база переносит
 *   статические атрибуты разметки корня (`autocomplete`), а шаблон кладёт
 *   `aria` ядра (`ownerAttributes`) и нативные `id`, `name`, `placeholder`,
 *   `disabled`, `readonly` и `required` — ARIA-дублей им ядро не пишет.
 * - Текст поля ведёт ядро: в ядро его несёт плагин ввода, в узел — привязка
 *   `value`, свойством и только если текст разошёлся с узлом. Узел уже держит
 *   набранное, и запись того же текста сбросила бы каретку в конец, а набор
 *   через IME прервала бы.
 * - Обёртка у начала поля — только при слоте `leading`, у конца — при слотах
 *   `clear` или `trailing` или при `clearable`. В ней первой стоит своя
 *   кнопка (слот `clear`) или встроенная, за ней — `trailing`, при любом
 *   порядке в разметке: свет раскладывается в порядке объявления слотов.
 * - Кнопка очистки — по `clearable`, как у Vue: деталь
 *   `<button is="so-button" embedded="input.clear" type="button">` с размером
 *   поля, выключена вместе с полем, `readonly` её не гасит — select-only
 *   Select и есть `readonly`, а очистка там работает. `type="button"` — в
 *   форме она не кнопка отправки. Внутри — иконка роли `close`,
 *   `<span is="so-icon" embedded="input.clear-icon">`. Имя ядро собирает с
 *   именем поля (`clearAria`), и на кнопку его кладёт шаблон верхним слоем,
 *   поверх того, что кнопка пишет себе сама. Очищает команда поля `clear` по
 *   нативному клику кнопки (`so:action:click`), и всплытие клика гасится у
 *   самого события: предок, который слушает клик по полю (select-only Select
 *   открывает по нему панель), его не получит, как у Vue `@click.stop`.
 *   События детали не всплывают, и слушатели поля их не слышат. Своя кнопка
 *   — слот `clear`: заменяет встроенную целиком и стоит, пока задана.
 *
 * У кнопки нет `view`: значения вида объявляет тема, и разметка библиотеки их
 * не знает. Кнопку тема красит по контексту (`.so-input__clear`).
 *
 * Scope у слотов нет, как у всех слотов Web Components: значение поля и
 * команду очистки содержимое слота берёт у элемента (`el.ctrl`).
 */

import type { IInput } from '@soldy-ui/core'
import {
	bind,
	createDetail,
	ownerAttributes,
	type ITemplate,
	type ITemplateContext,
} from '../../adapter'
import { TButtonElement, type TButtonElementProps } from '../button'
import { TIconElement, type TIconElementProps } from '../icon'

/** Части поля: поле и обёртки слотов по его сторонам, одни на всё время жизни элемента. */
type TInputParts = {
	readonly field: HTMLInputElement
	readonly leading: HTMLElement
	readonly trailing: HTMLElement
}

/** Кнопка очистки и иконка в ней. */
type TClearButton = {
	readonly button: TButtonElementProps
	readonly icon: TIconElementProps
}

const parts = new WeakMap<HTMLElement, TInputParts>()

/** Кнопка очистки каждого поля — строится с первым `clearable` и остаётся за ним. */
const clears = new WeakMap<HTMLElement, TClearButton>()

function isButton(node: Element): node is TButtonElementProps {
	return node instanceof TButtonElement
}

function isIcon(node: Element): node is TIconElementProps {
	return node instanceof TIconElement
}

/**
 * Кнопка очистки поля — деталь его разметки. Нажатие — команда поля `clear`
 * того инстанса, что живёт сейчас: контекст шаблона отдаёт его в момент
 * обращения.
 */
function clearOf(ctx: ITemplateContext<IInput>): TClearButton {
	const known = clears.get(ctx.root)

	if (known) return known

	const { ownerDocument } = ctx.root
	const button = createDetail(
		ownerDocument,
		'button',
		{ is: 'so-button', embedded: 'input.clear', attributes: { type: 'button' } },
		isButton,
	)
	const icon = createDetail(
		ownerDocument,
		'span',
		{ is: 'so-icon', embedded: 'input.clear-icon' },
		isIcon,
	)

	button.className = 'so-input__clear'
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

export const inputTemplate: ITemplate<IInput> = {
	create: (root, hasSlot) => {
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
			const { root, state, hasSlot } = ctx
			const own = parts.get(root)

			// Своя кнопка — слот `clear`: заменяет встроенную целиком
			if (!own || hasSlot('clear')) return

			if (state.clearable !== true) {
				clears.get(root)?.button.remove()

				// Обёртку у конца поля держала только кнопка
				if (!hasSlot('trailing')) own.trailing.remove()

				return
			}

			const { button, icon } = clearOf(ctx)
			const disabled = state.disabled === true

			// Пропсы кнопки и иконки — только сменившиеся: `disabled` кнопки
			// нативный, и каждая запись прошла бы через его атрибут
			if (button.size !== state.size) button.size = state.size
			if (button.disabled !== disabled) button.disabled = disabled
			if (icon.size !== state.size) icon.size = state.size

			ownerAttributes(button, state.clearAria)

			// Сначала кнопка в обёртку, потом обёртка в корень: кнопка входит в
			// документ одной вставкой и собирается один раз
			if (own.trailing.firstChild !== button) own.trailing.prepend(button)
			if (own.trailing.parentNode !== root) root.appendChild(own.trailing)
		}),
	],
}
