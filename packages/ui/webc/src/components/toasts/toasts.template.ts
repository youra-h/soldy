/**
 * Шаблон Toasts: приложение — свет на месте, за ним корень — регион `section`
 * со списком `ol.so-toasts__list`, тосты — петлёй по `shown` с копиями образцов
 * `item-*`. Регион стоит и пустым: живая область должна быть в документе до
 * первого тоста.
 */

import type { IToasts, IToastsItem, TToastsCollectionFacade } from '@soldy-ui/core'
import {
	TKeyedLoop,
	bind,
	createItem,
	lendSamples,
	type ITemplate,
	type ITemplateContext,
	type TItemSlots,
} from '../../adapter'
import { displayContents } from '../../adapter/runtime/display-contents'
import { TToastsItemElement, type TToastsItemElementProps } from './item'

/** Слот менеджера → слот тоста; сторож — `setup/__tests__/item-slots.spec.ts`. */
export const TOASTS_ITEM_SLOTS: TItemSlots = {
	'item-icon': 'icon',
	item: 'default',
	'item-content': 'content',
	'item-close-icon': 'close-icon',
}

type TToastsContext = ITemplateContext<IToasts, TToastsCollectionFacade>

const loops = new WeakMap<HTMLElement, TKeyedLoop<IToastsItem, number, TToastsItemElementProps>>()

/** `ctrl` и копии образцов — до вставки. */
function toastOf(ctx: TToastsContext, item: IToastsItem): TToastsItemElementProps {
	const toast = createItem(ctx.root.ownerDocument, TToastsItemElement)

	toast.ctrl = item
	lendSamples(ctx, toast, TOASTS_ITEM_SLOTS)

	return toast
}

export const toastsTemplate: ITemplate<IToasts, TToastsCollectionFacade> = {
	create: (root) => {
		const { ownerDocument } = root
		const region = ownerDocument.createElement('section')
		const list = ownerDocument.createElement('ol')

		// Своя коробка менеджеру не нужна: место в раскладке у приложения
		displayContents(root)

		list.className = 'so-toasts__list'
		region.appendChild(list)
		root.appendChild(region)
		loops.set(root, new TKeyedLoop(list, null, (item: IToastsItem) => item.uid))

		return {
			root: region,
			// Слоты тостов — образцы: копию получает каждый тост
			slots: {
				default: { mode: 'before', node: region },
				'item-icon': { mode: 'sample' },
				item: { mode: 'sample' },
				'item-content': { mode: 'sample' },
				'item-close-icon': { mode: 'sample' },
			},
		}
	},

	bindings: [
		bind('shown', (ctx) => {
			loops.get(ctx.root)?.draw(ctx.state.shown ?? [], (item) => toastOf(ctx, item))
		}),
	],
}
