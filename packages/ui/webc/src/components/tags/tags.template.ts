/**
 * Шаблон Tags: своей разметки нет — только теги; раскладку ряда тема ведёт по
 * `data-overflow`. Без тегов разметки — петля по `shown`, а не `items`: скрытый
 * отбором тег снимается, но из коллекции не уходит.
 */

import type { ITags, ITagsItem, TTagsCollectionFacade } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import {
	TKeyedLoop,
	bind,
	createItem,
	lendSamples,
	type ITemplate,
	type ITemplateContext,
	type TItemSlots,
} from '../../adapter'
import { TTagsItemElement } from './item'

/** Слот набора → слот тега; сторож — `setup/__tests__/item-slots.spec.ts`. */
export const TAGS_ITEM_SLOTS: TItemSlots = {
	'item-leading': 'leading',
	item: 'default',
	'item-trailing': 'trailing',
	'item-close-icon': 'close-icon',
}

const loops = new WeakMap<HTMLElement, TKeyedLoop<ITagsItem, number>>()

/** `ctrl` и копии образцов — до вставки. */
function tagOf(ctx: ITemplateContext<ITags, TTagsCollectionFacade>, item: ITagsItem): Element {
	const tag = createItem(ctx.root.ownerDocument, TTagsItemElement)

	tag.ctrl = item
	lendSamples(ctx, tag, TAGS_ITEM_SLOTS)

	return tag
}

export const tagsTemplate: ITemplate<ITags, TTagsCollectionFacade> = {
	create: (root, { hasSlot }) => {
		// Теги разметки — сами теги набора: петли из данных при них нет
		if (!hasSlot(DEFAULT_SLOT)) {
			loops.set(root, new TKeyedLoop(root, null, (item: ITagsItem) => item.uid))
		}

		return {
			slots: {
				default: { mode: 'append', node: root },
				item: { mode: 'sample' },
				'item-leading': { mode: 'sample' },
				'item-trailing': { mode: 'sample' },
				'item-close-icon': { mode: 'sample' },
			},
		}
	},

	bindings: [
		bind('shown', (ctx) => {
			loops.get(ctx.root)?.draw(ctx.state.shown ?? [], (item) => tagOf(ctx, item))
		}),
	],
}
