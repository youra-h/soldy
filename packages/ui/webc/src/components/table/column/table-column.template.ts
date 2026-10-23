/**
 * Шаблон заголовка колонки: ряд с подписью и кнопкой сортировки, ручка ширины.
 * Нажатие по ячейке не сортирует: у `th` нет фокуса, и с клавиатуры действие
 * было бы недоступно.
 */

import type { ITableColumn } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import {
	bind,
	createDetail,
	ownerAttributes,
	type ITemplate,
	type ITemplateContext,
	patch,
} from '../../../adapter'
import { TButtonElement, type TButtonElementProps } from '../../button'
import { TIconElement } from '../../icon'

type TColumnParts = {
	readonly content: HTMLElement
	readonly text: HTMLElement
}

type TResizer = {
	readonly strip: HTMLElement
	readonly field: HTMLInputElement
}

const parts = new WeakMap<HTMLElement, TColumnParts>()

const sorts = new WeakMap<HTMLElement, TButtonElementProps>()

const resizers = new WeakMap<HTMLElement, TResizer>()

/**
 * Кнопку рисует колонка, а не слот: в подписи она дописала бы своё имя к имени
 * заголовка. Вида и размера нет — их по контексту даёт тема.
 */
function sortOf(ctx: ITemplateContext<ITableColumn>): TButtonElementProps {
	const known = sorts.get(ctx.root)

	if (known) return known

	const { ownerDocument } = ctx.root
	const button = createDetail(ownerDocument, TButtonElement, {
		embedded: 'table.sort',
		attributes: { type: 'button' },
	})
	const arrow = ownerDocument.createElement('span')
	const icon = createDetail(ownerDocument, TIconElement, { embedded: 'table.sort-icon' })

	button.className = 'so-table-column__sort'
	arrow.className = 'so-table-column__sort-icon'
	// Направление скринридер объявляет по `aria-sort`; вниз стрелку поворачивает тема
	arrow.setAttribute('aria-hidden', 'true')
	icon.icon = 'arrowUpward'
	arrow.appendChild(icon)
	button.appendChild(arrow)
	// Инстанс живой связки — на момент нажатия
	button.addEventListener('so:action:press', () => ctx.ctrl?.toggleSort())
	sorts.set(ctx.root, button)

	return button
}

/** Нативный `range`, как у ручки Slider: мобильные скринридеры двигают его своим жестом. */
function resizerOf(root: HTMLElement): TResizer {
	const known = resizers.get(root)

	if (known) return known

	const { ownerDocument } = root
	const strip = ownerDocument.createElement('span')
	const field = ownerDocument.createElement('input')

	strip.className = 'so-table-column__resizer'
	field.className = 'so-table-column__input'
	field.type = 'range'
	strip.appendChild(field)

	const resizer = { strip, field }

	resizers.set(root, resizer)

	return resizer
}

export const tableColumnTemplate: ITemplate<ITableColumn> = {
	create: (root) => {
		const { ownerDocument } = root
		const content = ownerDocument.createElement('span')
		const text = ownerDocument.createElement('span')

		content.className = 'so-table-column__content'
		text.className = 'so-table-column__text'
		content.appendChild(text)
		root.appendChild(content)
		parts.set(root, { content, text })

		return {
			slots: {
				default: { mode: 'append', node: text },
			},
		}
	},

	bindings: [
		bind('textAria', ({ root, state }) => {
			const text = parts.get(root)?.text

			if (text) ownerAttributes(text, state.textAria)
		}),

		bind('text', ({ root, state, hasSlot }) => {
			const text = parts.get(root)?.text
			const value = state.text ?? ''

			if (text && !hasSlot(DEFAULT_SLOT) && text.textContent !== value) {
				text.textContent = value
			}
		}),

		bind(['sortable', 'disabled', 'sortAria'], (ctx) => {
			const { root, state } = ctx
			const own = parts.get(root)

			if (!own) return

			if (state.sortable !== true) {
				sorts.get(root)?.remove()

				return
			}

			const button = sortOf(ctx)
			const disabled = state.disabled === true

			// `disabled` кнопки нативный: запись прошла бы через его атрибут
			patch(button, { disabled })

			ownerAttributes(button, state.sortAria)

			if (button.parentNode !== own.content) own.content.appendChild(button)
		}),

		bind(['resizerRendered', 'resizer', 'resizerAria'], ({ root, state }) => {
			const { resizer } = state

			if (state.resizerRendered !== true || !resizer) {
				resizers.get(root)?.strip.remove()

				return
			}

			const { strip, field } = resizerOf(root)
			const value = String(resizer.value)

			// Ход раньше значения, иначе ширина прижалась бы к 0–100; ширину ведёт ядро
			field.min = String(resizer.min)
			field.max = String(resizer.max)

			patch(field, { value })

			ownerAttributes(field, state.resizerAria)

			// У края заголовка — ребёнком корня: там полосу ищет плагин ручки
			if (strip.parentNode !== root) root.appendChild(strip)
		}),
	],
}
