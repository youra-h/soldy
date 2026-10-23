/**
 * Шаблон Toasts.
 *
 * Элемент `<so-toasts>` — менеджер вокруг приложения, как `LocaleProvider`:
 * своей коробки у него нет (`displayContents`), и приложение — его свет, слот
 * `default` — остаётся на месте и раскладывается его родителем, как будто
 * обёртки нет. У Vue менеджер своего узла не рисует вовсе. Потомки берут API
 * тостов у элемента — `toastsOf(node)`.
 *
 * Корень компонента — регион `section` за приложением, узел шаблона
 * (`TTemplateParts.root`, описание корня `wrapped`): в цель слоя его уводит
 * база, на месте в элементе остаётся якорь. На регион база кладёт классы
 * (`so-toasts--placement-*`, `so-toasts--layout-*`), наборы (`role="region"`,
 * `aria-live`, имя от локали, `data-layer`), `z-index` слоя (`layout_styles`)
 * и скрытие, а при построении — и атрибуты разметки элемента, класс и стиль
 * тоже, как `$attrs` региона у Vue. Регион стоит всегда, и пустым: живая
 * область должна быть в документе до первого тоста. Места он не занимает и
 * нажатий мимо тостов не ловит — это тема.
 *
 * В регионе — список `ol.so-toasts__list`: тост на каждый показанный элемент
 * коллекции (`shown`), новый — первым, петлёй по ключу `uid` (`TKeyedLoop`).
 * Тост — внутренняя часть `<li is="so-toasts-item">` с инстансом тоста и
 * копиями образцов `item-*` менеджера в своих слотах (`TOASTS_ITEM_SLOTS`, по
 * таблице пробросов). Закрытый тост остаётся в списке, пока гаснет, и уходит
 * из коллекции, когда доиграли переходы его корня.
 *
 * Слоты `item-*` — образцы (`<template slot="item-icon">`): scope у слотов Web
 * Components нет, и копию одного образца получает каждый тост. Тост и его вид
 * копия берёт у элемента тоста — `el.ctrl` ближайшего `.so-toasts-item`.
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

/**
 * Копии образцов в тост: слот менеджера → слот тоста, как проброс у
 * остальных адаптеров (`setup/__tests__/item-slots.spec.ts`).
 */
export const TOASTS_ITEM_SLOTS: TItemSlots = {
	'item-icon': 'icon',
	item: 'default',
	'item-content': 'content',
	'item-close-icon': 'close-icon',
}

/** Контекст шаблона менеджера. */
type TToastsContext = ITemplateContext<IToasts, TToastsCollectionFacade>

/** Тосты региона каждого менеджера — петлёй по ключу тоста. */
const loops = new WeakMap<HTMLElement, TKeyedLoop<IToastsItem, number, TToastsItemElementProps>>()

/** Тост из данных — инстанс и копии образцов до вставки. */
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
			// Приложение — перед регионом, как слот перед телепортом у Vue; тосты —
			// образцы: копию шаблон кладёт в каждый тост
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
