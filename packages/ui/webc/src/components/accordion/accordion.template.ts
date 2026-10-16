/**
 * Шаблон Accordion.
 *
 * Корень — сам `<div is="so-accordion">`: классы, `attrs` и скрытие
 * раскладывает на него база (`SoldyElement`). Своей разметки у аккордеона
 * нет — только секции.
 *
 * - Секции — слот `default`: элементы разметки `<div is="so-accordion-item">`.
 *   В коллекцию секция входит сама, когда собирается: движок аккордеона она
 *   находит лифтом вверх по документу.
 * - Без секций разметки — секции из данных (`items`, `engine`): петля по
 *   `shown` (`TKeyedLoop`) строит `<div is="so-accordion-item">` на каждый
 *   элемент, с инстансом данных и копиями образцов `item-*`. Панели у секции
 *   нет отдельной частью: она внутри элемента, и содержимое секции из данных —
 *   образец `item-content`.
 * - `item`, `item-leading-icon`, `item-leading`, `item-trailing`,
 *   `item-trailing-icon`, `item-content` — образцы слотов секций из данных
 *   (`<template slot="item-content">`): scope у слотов Web Components нет, и
 *   копию одного образца получает каждая секция. Данные копия берёт у секции
 *   (`el.ctrl`).
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

/**
 * Копии образцов в секции из данных: слот аккордеона → слот секции, как
 * проброс у остальных адаптеров (`setup/__tests__/item-slots.spec.ts`):
 * заголовок секции (`header`) — `item`, панель (`default`) — `item-content`.
 */
export const ACCORDION_ITEM_SLOTS: TItemSlots = {
	'item-leading-icon': 'leading-icon',
	'item-leading': 'leading',
	item: 'header',
	'item-trailing': 'trailing',
	'item-trailing-icon': 'trailing-icon',
	'item-content': 'default',
}

/** Петля секций из данных — только у аккордеона без секций разметки. */
const loops = new WeakMap<HTMLElement, TKeyedLoop<IAccordionItem, number>>()

function isSection(node: Element): node is TAccordionItemElementProps {
	return node instanceof TAccordionItemElement
}

/** Секция из данных: инстанс данных и копии образцов — до вставки. */
function sectionOf(
	ctx: ITemplateContext<IAccordion, TAccordionCollectionFacade>,
	item: IAccordionItem,
): TAccordionItemElementProps {
	const section = createItem(ctx.root.ownerDocument, 'div', 'so-accordion-item', isSection)

	section.ctrl = item
	lendSamples(ctx, section, ACCORDION_ITEM_SLOTS)

	return section
}

export const accordionTemplate: ITemplate<IAccordion, TAccordionCollectionFacade> = {
	create: (root, hasSlot) => {
		// Секции разметки — сами секции аккордеона: петли из данных при них нет
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
