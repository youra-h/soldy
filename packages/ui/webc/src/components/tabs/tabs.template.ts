/**
 * Шаблон Tabs: набор `aria` владельца — на списке табов `div.so-tabs__list`.
 * Список и панели — дети корня, табы — дети списка: тема рисует набор дочерними
 * комбинаторами. docs/architecture.md, Layer 8d, «Коллекция».
 */

import type { ITabs, ITabsItem, TTabsCollectionFacade } from '@soldy-ui/core'
import {
	TKeyedLoop,
	bind,
	createItem,
	lendSamples,
	ownerAttributes,
	type ITemplate,
	type ITemplateContext,
	type TItemSlots,
} from '../../adapter'
import { TTabsItemElement, type TTabsItemElementProps } from './item'

/** Образец набора → слот таба из данных (`setup/__tests__/item-slots.spec.ts`). */
export const TABS_ITEM_SLOTS: TItemSlots = {
	item: 'default',
	'item-leading': 'leading',
	'item-trailing': 'trailing',
	'item-close-icon': 'close-icon',
}

const lists = new WeakMap<HTMLElement, HTMLElement>()

const loops = new WeakMap<HTMLElement, TKeyedLoop<ITabsItem, number>>()

/** Таб из данных: инстанс данных и копии образцов — до вставки. */
function tabOf(
	ctx: ITemplateContext<ITabs, TTabsCollectionFacade>,
	item: ITabsItem,
): TTabsItemElementProps {
	const tab = createItem(ctx.root.ownerDocument, TTabsItemElement)

	tab.ctrl = item
	lendSamples(ctx, tab, TABS_ITEM_SLOTS)

	return tab
}

export const tabsTemplate: ITemplate<ITabs, TTabsCollectionFacade> = {
	create: (root, { hasSlot }) => {
		const { ownerDocument } = root
		const list = ownerDocument.createElement('div')
		const leading = ownerDocument.createElement('div')
		const trailing = ownerDocument.createElement('div')

		list.className = 'so-tabs__list'
		leading.className = 'so-tabs__list--leading'
		trailing.className = 'so-tabs__list--trailing'
		root.appendChild(list)

		if (hasSlot('leading')) list.appendChild(leading)

		const end = hasSlot('trailing') ? trailing : null

		if (end) list.appendChild(end)

		if (!hasSlot('default')) {
			loops.set(root, new TKeyedLoop(list, end, (item: ITabsItem) => item.uid))
		}

		lists.set(root, list)

		return {
			slots: {
				leading: { mode: 'append', node: leading },
				default: end ? { mode: 'before', node: end } : { mode: 'append', node: list },
				trailing: { mode: 'append', node: trailing },
				// Панели — после списка: в `default` они оказались бы внутри `[role=tablist]`
				content: { mode: 'append', node: root },
				item: { mode: 'sample' },
				'item-leading': { mode: 'sample' },
				'item-trailing': { mode: 'sample' },
				'item-close-icon': { mode: 'sample' },
			},
			control: list,
		}
	},

	bindings: [
		bind('aria', ({ root, state }) => {
			const list = lists.get(root)

			if (list) ownerAttributes(list, state.aria)
		}),

		bind('shown', (ctx) => {
			loops.get(ctx.root)?.draw(ctx.state.shown ?? [], (item) => tabOf(ctx, item))
		}),
	],
}
