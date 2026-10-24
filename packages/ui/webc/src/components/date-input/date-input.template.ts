/**
 * Шаблон DateInput: обёртка `leading`, ряд частей, обёртка у конца поля, скрытое
 * поле для формы. Ряд — флекс из коробок, а не строка текста: иначе Chrome
 * переносит начало протяжки мышью в соседний текст. Текст части пишется, только
 * когда разошёлся с узлом: на касание часть редактируемая, и браузер оставляет
 * её пустой или из нескольких узлов. Очистка — как у Input.
 */

import type { IDateInput, TDateInputSegment } from '@soldy-ui/core'
import type { TDateInputOutputs } from './setup.component'
import { TKeyedLoop, bind, ownerAttributes, type ITemplate, patch } from '../../adapter'
import { placeClearButton } from '../common/clear'

/** Части поля, одни на всё время жизни элемента. */
type TDateInputParts = {
	readonly leading: HTMLElement
	readonly segments: HTMLElement
	readonly trailing: HTMLElement
	readonly hidden: HTMLInputElement
	/** По ключу записи: при наборе и смене локали узел части остаётся тем же — с фокусом. */
	readonly loop: TKeyedLoop<TDateInputSegment, string, HTMLElement>
}

const parts = new WeakMap<HTMLElement, TDateInputParts>()

/** Наборы части — одним слоем владельца: два вызова затёрли бы друг друга. */
function drawSegment(node: HTMLElement, segment: TDateInputSegment): void {
	if (segment.type === 'literal') {
		ownerAttributes(node, segment.aria)
	} else {
		ownerAttributes(node, { ...segment.attrs, ...segment.aria, ...segment.dataset })
	}

	patch(node, { textContent: segment.text })
}

/** Узел части или разделителя — по виду записи: ключ записи вида не меняет. */
function segmentOf(owner: Document, segment: TDateInputSegment): HTMLElement {
	const node = owner.createElement('span')

	node.className =
		segment.type === 'literal' ? 'so-date-input__literal' : 'so-date-input__segment'
	drawSegment(node, segment)

	return node
}

export const dateInputTemplate: ITemplate<IDateInput, unknown, TDateInputOutputs> = {
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
			const own = parts.get(ctx.root)

			if (own) placeClearButton(ctx, 'date-input', own.trailing, own.hidden)
		}),

		// Значение для формы — дата строкой, пока она не собрана — пусто
		bind(['name', 'value', 'disabled'], ({ root, state }) => {
			const hidden = parts.get(root)?.hidden

			if (!hidden) return

			const value = state.value ?? ''

			hidden.name = state.name ?? ''
			hidden.disabled = state.disabled === true

			patch(hidden, { value })
		}),
	],
}
