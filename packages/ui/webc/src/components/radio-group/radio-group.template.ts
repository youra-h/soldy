/**
 * Шаблон RadioGroup: своей разметки нет, радио разметки стоят где угодно в
 * корне; без них — радио из данных петлёй по `shown` с копией образца `item`.
 * docs/architecture.md, Layer 8d, «Коллекция».
 */

import type { IRadioGroup, IRadioGroupItem, TRadioGroupCollectionFacade } from '@soldy-ui/core'
import {
	TKeyedLoop,
	bind,
	createItem,
	lendSamples,
	type ITemplate,
	type ITemplateContext,
	type TItemSlots,
} from '../../adapter'
import { TRadioGroupItemElement, type TRadioGroupItemElementProps } from './item'

/** Слот группы → слот радио; сверяет `setup/__tests__/item-slots.spec.ts`. */
export const RADIO_GROUP_ITEM_SLOTS: TItemSlots = { item: 'default' }

const loops = new WeakMap<HTMLElement, TKeyedLoop<IRadioGroupItem, number>>()

/** Инстанс данных и копия подписи — до вставки. */
function radioOf(
	ctx: ITemplateContext<IRadioGroup, TRadioGroupCollectionFacade>,
	item: IRadioGroupItem,
): TRadioGroupItemElementProps {
	const radio = createItem(ctx.root.ownerDocument, TRadioGroupItemElement)

	radio.ctrl = item
	lendSamples(ctx, radio, RADIO_GROUP_ITEM_SLOTS)

	return radio
}

export const radioGroupTemplate: ITemplate<IRadioGroup, TRadioGroupCollectionFacade> = {
	create: (root, { hasSlot }) => {
		if (!hasSlot('default')) {
			loops.set(root, new TKeyedLoop(root, null, (item: IRadioGroupItem) => item.uid))
		}

		return {
			slots: {
				default: { mode: 'append', node: root },
				item: { mode: 'sample' },
			},
		}
	},

	bindings: [
		bind('shown', (ctx) => {
			loops.get(ctx.root)?.draw(ctx.state.shown ?? [], (item) => radioOf(ctx, item))
		}),
	],
}
