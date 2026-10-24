/**
 * Шаблон Tabs: набор `aria` владельца — на списке табов `div.so-tabs__list`.
 * Ряд `div.so-tabs__bar` и панели — дети корня, список и слоты `leading` и
 * `trailing` — дети ряда, табы — дети списка: в `[role=tablist]` ARIA пускает
 * только `tab`, а тема рисует набор дочерними комбинаторами. docs/architecture.md,
 * Layer 8d, «Коллекция».
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
		const bar = ownerDocument.createElement('div')
		const list = ownerDocument.createElement('div')
		const leading = ownerDocument.createElement('div')
		const trailing = ownerDocument.createElement('div')

		bar.className = 'so-tabs__bar'
		list.className = 'so-tabs__list'
		leading.className = 'so-tabs__leading'
		trailing.className = 'so-tabs__trailing'
		root.appendChild(bar)

		// Слоты — в ряду по краям списка, а не в нём: в списке только табы
		if (hasSlot('leading')) bar.appendChild(leading)

		bar.appendChild(list)

		if (hasSlot('trailing')) bar.appendChild(trailing)

		if (!hasSlot('default')) {
			loops.set(root, new TKeyedLoop(list, null, (item: ITabsItem) => item.uid))
		}

		lists.set(root, list)

		return {
			slots: {
				leading: { mode: 'append', node: leading },
				default: { mode: 'append', node: list },
				trailing: { mode: 'append', node: trailing },
				// Панели — после ряда: в `default` они оказались бы внутри `[role=tablist]`
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
