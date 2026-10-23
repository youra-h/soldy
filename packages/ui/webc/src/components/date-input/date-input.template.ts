/**
 * Шаблон DateInput.
 *
 * Корень — сам `<div is="so-date-input">`: классы, наборы `attrs` (`dir`
 * поля), `aria` (`role="group"`, имя) и `dataset` (`data-disabled`,
 * `data-invalid`) и скрытие раскладывает на него база (`ElementBase`), `id`
 * корня — привязка, как `:id="id"` у Vue. Здесь — то же, что в разметке Vue,
 * в том же порядке: обёртка слота `leading`, ряд частей, обёртка у конца поля
 * и значение для формы.
 *
 * - Ряд частей — `span.so-date-input__segments` с набором `segmentsAttrs`
 *   (`dir` по дате в локали и `lang` формата). Каждая часть и каждый
 *   разделитель — своя коробка: ряд — флекс, а не строка текста, иначе Chrome
 *   переносит начало протяжки мышью от левого края части в соседний текст.
 * - Части и разделители — выход ядра `segments`, новый на каждую смену,
 *   поэтому петля идёт по ключу записи (`TKeyedLoop`): ключ части — её тип,
 *   разделителя — место в формате. При наборе и при смене локали часть меняет
 *   текст и место, а её узел остаётся тем же — с фокусом на нём. Часть —
 *   `span.so-date-input__segment` с наборами `attrs` (на касание —
 *   `contenteditable` и `inputmode`), `aria` (`role="spinbutton"`, имя,
 *   `aria-value*`, остановка Tab, `id`) и `dataset` (`data-type`,
 *   `data-placeholder`) — одним слоем владельца, в порядке Vue: два вызова
 *   затёрли бы набор друг друга. Разделитель — литерал формата под
 *   `aria-hidden` (его `aria`).
 * - Текст части — `textContent` узла, и пишется он, только когда разошёлся с
 *   узлом: на касание часть редактируемая, и браузер (композиция, клавиатура,
 *   которая правит и после погашенного Backspace) оставляет её пустой или из
 *   нескольких узлов — запись целиком возвращает текст ядра, а тот же текст
 *   узел не трогает.
 * - Обёртка у конца поля — при слотах `clear` или `trailing` или при
 *   `clearable`; встаёт она перед скрытым полем. В ней первой — своя кнопка
 *   (слот `clear`) или встроенная очистка, за ней — `trailing`, при любом
 *   порядке в разметке. Очистка — как у Input: деталь
 *   `<button is="so-button" embedded="date-input.clear" type="button">` с
 *   иконкой роли `close`, размером поля, выключена вместе с полем, `readonly`
 *   её не гасит; имя — набор поля `clearAria`, очищает команда поля `clear` —
 *   все части, и скрытые форматом тоже, — по нативному клику кнопки, гася его
 *   всплытие (`@click.stop` у Vue).
 * - Значение для формы — скрытое поле последним: `name`, `value` — дата
 *   строкой, у поля даты и времени — с временем; пока значение не собрано —
 *   пусто. Выключенное поле в форму не уходит.
 *
 * Обработчиков, кроме очистки, у шаблона нет: клавиши, буфер обмена,
 * выделение, контекстное меню и касание ловят плагины поля на корне.
 *
 * Scope у слотов нет, как у всех слотов Web Components: значение поля и его
 * команды содержимое слота берёт у элемента (`el.ctrl`).
 */

import type { IDateInput, TDateInputSegment } from '@soldy-ui/core'
import {
	TKeyedLoop,
	bind,
	createDetail,
	ownerAttributes,
	type ITemplate,
	type ITemplateContext,
} from '../../adapter'
import { TButtonElement, type TButtonElementProps } from '../button'
import { TIconElement, type TIconElementProps } from '../icon'

/** Части поля, одни на всё время жизни элемента. */
type TDateInputParts = {
	readonly leading: HTMLElement
	readonly segments: HTMLElement
	readonly trailing: HTMLElement
	readonly hidden: HTMLInputElement
	/** Петля частей и разделителей ряда — по ключу записи. */
	readonly loop: TKeyedLoop<TDateInputSegment, string, HTMLElement>
}

/** Кнопка очистки и иконка в ней. */
type TClearButton = {
	readonly button: TButtonElementProps
	readonly icon: TIconElementProps
}

const parts = new WeakMap<HTMLElement, TDateInputParts>()

/** Кнопка очистки каждого поля — строится с первым `clearable` и остаётся за ним. */
const clears = new WeakMap<HTMLElement, TClearButton>()

function isButton(node: Element): node is TButtonElementProps {
	return node instanceof TButtonElement
}

function isIcon(node: Element): node is TIconElementProps {
	return node instanceof TIconElement
}

/**
 * Наборы и текст части или разделителя — на её узел. Наборы части — одним
 * слоем владельца; текст — только разошедшийся с узлом (см. шапку).
 */
function drawSegment(node: HTMLElement, segment: TDateInputSegment): void {
	if (segment.type === 'literal') {
		ownerAttributes(node, segment.aria)
	} else {
		ownerAttributes(node, { ...segment.attrs, ...segment.aria, ...segment.dataset })
	}

	if (node.textContent !== segment.text) node.textContent = segment.text
}

/** Узел части или разделителя — по виду записи: ключ записи вида не меняет. */
function segmentOf(owner: Document, segment: TDateInputSegment): HTMLElement {
	const node = owner.createElement('span')

	node.className =
		segment.type === 'literal' ? 'so-date-input__literal' : 'so-date-input__segment'
	drawSegment(node, segment)

	return node
}

/**
 * Кнопка очистки поля — деталь его разметки. Нажатие — команда поля `clear`
 * того инстанса, что живёт сейчас: контекст шаблона отдаёт его в момент
 * обращения.
 */
function clearOf(ctx: ITemplateContext<IDateInput>): TClearButton {
	const known = clears.get(ctx.root)

	if (known) return known

	const { ownerDocument } = ctx.root
	const button = createDetail(
		ownerDocument,
		'button',
		{ is: 'so-button', embedded: 'date-input.clear', attributes: { type: 'button' } },
		isButton,
	)
	const icon = createDetail(
		ownerDocument,
		'span',
		{ is: 'so-icon', embedded: 'date-input.clear-icon' },
		isIcon,
	)

	button.className = 'so-date-input__clear'
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

export const dateInputTemplate: ITemplate<IDateInput> = {
	create: (root, { hasSlot }) => {
		const { ownerDocument } = root
		const leading = ownerDocument.createElement('div')
		const segments = ownerDocument.createElement('span')
		const trailing = ownerDocument.createElement('div')
		const hidden = ownerDocument.createElement('input')

		leading.className = 'so-date-input__leading'
		segments.className = 'so-date-input__segments'
		trailing.className = 'so-date-input__trailing'
		hidden.type = 'hidden'

		// Обёртка — только когда в неё есть что положить; у конца поля её
		// приносит и `clearable` — см. привязку кнопки очистки
		if (hasSlot('leading')) root.appendChild(leading)

		root.appendChild(segments)

		if (hasSlot('clear') || hasSlot('trailing')) root.appendChild(trailing)

		root.appendChild(hidden)
		parts.set(root, {
			leading,
			segments,
			trailing,
			hidden,
			loop: new TKeyedLoop(segments, null, (segment: TDateInputSegment) => segment.key),
		})

		return {
			// `clear` объявлен раньше `trailing`: в обёртке у конца поля он первый
			slots: {
				leading: { mode: 'append', node: leading },
				clear: { mode: 'append', node: trailing },
				trailing: { mode: 'append', node: trailing },
			},
		}
	},

	bindings: [
		// `id` корня — `id` поля, как `:id="id"` у Vue: атрибут разметки — его
		// вход, а записанный инстансу из кода доходит до узла здесь
		bind('id', ({ root, state }) => {
			if (state.id === undefined) {
				if (root.hasAttribute('id')) root.removeAttribute('id')
			} else if (root.id !== state.id) {
				root.id = state.id
			}
		}),

		bind('segmentsAttrs', ({ root, state }) => {
			const segments = parts.get(root)?.segments

			if (segments) ownerAttributes(segments, state.segmentsAttrs)
		}),

		bind('segments', ({ root, state }) => {
			const own = parts.get(root)

			if (!own) return

			own.loop.draw(
				state.segments ?? [],
				(segment) => segmentOf(root.ownerDocument, segment),
				drawSegment,
			)
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

			// Сначала кнопка в обёртку, потом обёртка в корень — перед скрытым
			// полем: кнопка входит в документ одной вставкой и собирается один раз
			if (own.trailing.firstChild !== button) own.trailing.prepend(button)
			if (own.trailing.parentNode !== root) root.insertBefore(own.trailing, own.hidden)
		}),

		// Значение для формы — дата строкой, пока она не собрана — пусто
		bind(['name', 'value', 'disabled'], ({ root, state }) => {
			const hidden = parts.get(root)?.hidden

			if (!hidden) return

			const value = state.value ?? ''

			hidden.name = state.name ?? ''
			hidden.disabled = state.disabled === true

			if (hidden.value !== value) hidden.value = value
		}),
	],
}
