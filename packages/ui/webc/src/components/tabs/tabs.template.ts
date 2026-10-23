/**
 * Шаблон Tabs.
 *
 * Корень — сам `<div is="so-tabs">`: классы, `attrs` и скрытие раскладывает на
 * него база (`ElementBase`). Набор `aria` владельца — это список табов
 * (`role="tablist"`, `aria-orientation`, имя из `aria_label`), и на
 * `div.so-tabs__list` его кладёт шаблон: на корне рядом со списком лежат
 * панели. Тема рисует вид набора от корня дочерними комбинаторами, поэтому
 * список и панели — дети корня, а табы — дети списка. Список табов шаблон
 * отдаёт базе полем корня (`control`): на него база переносит статические
 * атрибуты разметки корня.
 *
 * - Табы — слот `default`, в списке между обёртками краёв: элементы разметки
 *   `<div is="so-tabs-item">`. В коллекцию таб входит сам, когда собирается:
 *   движок набора он находит лифтом вверх по документу.
 * - Без табов разметки — табы из данных (`items`, `engine`): петля по `shown`
 *   (`TKeyedLoop`) строит `<div is="so-tabs-item">` на каждый элемент, с
 *   инстансом данных и копиями образцов `item-*`.
 * - `leading` и `trailing` — по краям списка, в своих обёртках; обёртка стоит,
 *   только когда её слот задан.
 * - `content` — панели (`<div is="so-tabs-content" slot="content">`), после
 *   списка: `default` лежит внутри `[role=tablist]`, и панель, попав туда,
 *   оказалась бы в списке табов.
 * - `item`, `item-leading`, `item-trailing`, `item-close-icon` — образцы
 *   слотов табов из данных (`<template slot="item-leading">`): scope у слотов
 *   Web Components нет, и копию одного образца получает каждый таб. Данные
 *   копия берёт у таба (`el.ctrl`).
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

/**
 * Копии образцов в табы из данных: слот набора → слот таба, как проброс у
 * остальных адаптеров (`setup/__tests__/item-slots.spec.ts`).
 */
export const TABS_ITEM_SLOTS: TItemSlots = {
	item: 'default',
	'item-leading': 'leading',
	'item-trailing': 'trailing',
	'item-close-icon': 'close-icon',
}

/** Список табов каждого набора — один на всё время жизни элемента. */
const lists = new WeakMap<HTMLElement, HTMLElement>()

/** Петля табов из данных — только у набора без табов разметки. */
const loops = new WeakMap<HTMLElement, TKeyedLoop<ITabsItem, number>>()

function isTab(node: Element): node is TTabsItemElementProps {
	return node instanceof TTabsItemElement
}

/** Таб из данных: инстанс данных и копии образцов — до вставки. */
function tabOf(
	ctx: ITemplateContext<ITabs, TTabsCollectionFacade>,
	item: ITabsItem,
): TTabsItemElementProps {
	const tab = createItem(ctx.root.ownerDocument, 'div', 'so-tabs-item', isTab)

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

		// Обёртка края — только когда в неё есть что положить
		if (hasSlot('leading')) list.appendChild(leading)

		// Табы — перед обёрткой конца, если она есть
		const end = hasSlot('trailing') ? trailing : null

		if (end) list.appendChild(end)

		// Табы разметки — сами табы набора: петли из данных при них нет
		if (!hasSlot('default')) {
			loops.set(root, new TKeyedLoop(list, end, (item: ITabsItem) => item.uid))
		}

		lists.set(root, list)

		return {
			slots: {
				leading: { mode: 'append', node: leading },
				default: end ? { mode: 'before', node: end } : { mode: 'append', node: list },
				trailing: { mode: 'append', node: trailing },
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
