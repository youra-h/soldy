/**
 * Шаблон страницы: строка — деталь Button с номером или текстом страницы.
 * Текущая — не выключенная кнопка: каждая страница — своя остановка Tab.
 * Нажатие делает страницу текущей активацией коллекции через контекст фасада.
 */

import type { IPaginationItem, TPaginationItemCollectionFacade } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import { bind, createDetail, ownerAttributes, type ITemplate, patch } from '../../../adapter'
import { TButtonElement, type TButtonElementProps } from '../../button'

const rows = new WeakMap<HTMLElement, TButtonElementProps>()

export const paginationItemTemplate: ITemplate<IPaginationItem, TPaginationItemCollectionFacade> = {
	create: (root, ctx) => {
		const row = createDetail(root.ownerDocument, TButtonElement, {
			embedded: 'pagination.page',
			attributes: { type: 'button' },
		})

		row.addEventListener('click', () => {
			const context = ctx.facade?.context

			if (context) context.adapters.activation.active = true
		})

		root.appendChild(row)
		rows.set(root, row)

		return {
			slots: {
				default: { mode: 'append', node: row, slot: DEFAULT_SLOT },
			},
		}
	},

	bindings: [
		// Только сменившиеся: `disabled` кнопки нативный, и запись прошла бы через атрибут
		bind(['disabled', 'size', 'variant'], ({ root, state }) => {
			const row = rows.get(root)

			if (!row) return

			const disabled = state.disabled === true

			patch(row, { disabled, size: state.size, variant: state.variant })
		}),

		bind('aria', ({ root, state }) => {
			const row = rows.get(root)

			if (row) ownerAttributes(row, state.aria)
		}),

		bind('text', ({ root, state, hasSlot }) => {
			const row = rows.get(root)
			const text = state.text ?? ''

			if (row && !hasSlot(DEFAULT_SLOT) && row.text !== text) row.text = text
		}),
	],
}
