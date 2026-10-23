/**
 * Шаблон ListBox: корень — рамка (`header`, узел списка, `footer`), набор `aria`
 * владельца — на узле списка: в `listbox` ARIA пускает только опции и группы.
 * Без элементов разметки строки по секциям рисует `TDrawnRows`.
 * docs/architecture.md, Layer 8d, «Коллекция».
 */

import type { IListBox, IListBoxItem, TListBoxCollectionFacade } from '@soldy-ui/core'
import { bind, ownerAttributes, type ITemplate, type TItemSlots } from '../../adapter'
import { TDrawnRows, type TDrawnRowsSpec } from '../common/drawn-rows'
import { TListBoxItemElement } from './item'
import { TListBoxGroupElement } from './group'

/** Образец списка → слот элемента из данных (`setup/__tests__/item-slots.spec.ts`). */
export const LIST_BOX_ITEM_SLOTS: TItemSlots = {
	'item-leading': 'leading',
	item: 'default',
	'item-trailing': 'trailing',
	'item-indicator-icon': 'indicator-icon',
}

const ROWS: TDrawnRowsSpec<IListBoxItem> = {
	block: 'list-box',
	item: TListBoxItemElement,
	group: TListBoxGroupElement,
	slots: LIST_BOX_ITEM_SLOTS,
}

const lists = new WeakMap<HTMLElement, HTMLElement>()

/** Строки — только у списка без элементов разметки. */
const rows = new WeakMap<HTMLElement, TDrawnRows<IListBoxItem>>()

export const listBoxTemplate: ITemplate<IListBox, TListBoxCollectionFacade> = {
	create: (root, { hasSlot }) => {
		const { ownerDocument } = root
		const list = ownerDocument.createElement('div')
		const end = ownerDocument.createComment('')

		list.className = 'so-list-box__list'
		// Остановка Tab; `tabindex` разметки база переносит позже, и он главнее
		list.setAttribute('tabindex', '0')
		// Конец элементов: строки и снова показанный `empty` встают перед ним
		list.appendChild(end)
		root.appendChild(list)

		if (!hasSlot('default')) {
			rows.set(root, new TDrawnRows(list, end, ROWS))
		}

		lists.set(root, list)

		return {
			slots: {
				header: { mode: 'before', node: list },
				default: { mode: 'before', node: end },
				// Внутри списка: пустой `listbox` для скринридера — тупик
				empty: { mode: 'before', node: end },
				footer: { mode: 'append', node: root },
				item: { mode: 'sample' },
				'item-leading': { mode: 'sample' },
				'item-trailing': { mode: 'sample' },
				'item-indicator-icon': { mode: 'sample' },
			},
			control: list,
		}
	},

	bindings: [
		bind('aria', ({ root, state }) => {
			const list = lists.get(root)

			if (list) ownerAttributes(list, state.aria)
		}),

		bind(['drawnSections', 'groupSeparators'], (ctx) => {
			rows.get(ctx.root)?.draw(
				ctx,
				ctx.state.drawnSections,
				ctx.state.groupSeparators === true,
			)
		}),

		bind('shown', ({ state, showSlot }) => {
			showSlot('empty', (state.shown ?? []).length === 0)
		}),
	],
}
