/**
 * Шаблон Accordion: своей разметки нет, только секции; без секций разметки —
 * секции из данных петлёй по `shown` с копиями образцов `item-*`.
 * docs/architecture.md, Layer 8d, «Коллекция».
 */

import type { IAccordion, IAccordionItem, TAccordionCollectionFacade } from '@soldy-ui/core'
import {
	TKeyedLoop,
	bind,
	createItem,
	lendSamples,
	type ITemplate,
	type ITemplateContext,
	type TItemSlots,
} from '../../adapter'
import { TAccordionItemElement, type TAccordionItemElementProps } from './item'

/** Слот аккордеона → слот секции; сверяет `setup/__tests__/item-slots.spec.ts`. */
export const ACCORDION_ITEM_SLOTS: TItemSlots = {
	'item-leading-icon': 'leading-icon',
	'item-leading': 'leading',
	item: 'header',
	'item-trailing': 'trailing',
	'item-trailing-icon': 'trailing-icon',
	'item-content': 'default',
}

const loops = new WeakMap<HTMLElement, TKeyedLoop<IAccordionItem, number>>()

/** Инстанс данных и копии образцов — до вставки. */
function sectionOf(
	ctx: ITemplateContext<IAccordion, TAccordionCollectionFacade>,
	item: IAccordionItem,
): TAccordionItemElementProps {
	const section = createItem(ctx.root.ownerDocument, TAccordionItemElement)

	section.ctrl = item
	lendSamples(ctx, section, ACCORDION_ITEM_SLOTS)

	return section
}

export const accordionTemplate: ITemplate<IAccordion, TAccordionCollectionFacade> = {
	create: (root, { hasSlot }) => {
		if (!hasSlot('default')) {
			loops.set(root, new TKeyedLoop(root, null, (item: IAccordionItem) => item.uid))
		}

		return {
			slots: {
				default: { mode: 'append', node: root },
				item: { mode: 'sample' },
				'item-leading-icon': { mode: 'sample' },
				'item-leading': { mode: 'sample' },
				'item-trailing': { mode: 'sample' },
				'item-trailing-icon': { mode: 'sample' },
				'item-content': { mode: 'sample' },
			},
		}
	},

	bindings: [
		bind('shown', (ctx) => {
			loops.get(ctx.root)?.draw(ctx.state.shown ?? [], (item) => sectionOf(ctx, item))
		}),
	],
}
