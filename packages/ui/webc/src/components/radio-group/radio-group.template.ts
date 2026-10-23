/**
 * Шаблон RadioGroup.
 *
 * Корень — сам `<div is="so-radio-group">`: классы и наборы ядра раскладывает
 * на него база (`ElementBase`), набор `aria` группы — здесь: `role="radiogroup"`
 * пишет ядро, имя из `aria_label` / `aria_labelledBy` — `TAriaPlugin`. Своей
 * разметки у группы нет: радио одной группы стоят где угодно внутри корня, и
 * раскладку задаёт потребитель.
 *
 * - Радио — слот `default`: `<label is="so-radio-group-item">` где угодно
 *   внутри, хоть в строках чужого списка. В группу радио входит само, когда
 *   собирается: движок группы оно находит лифтом вверх по документу.
 * - Без радио разметки — радио из данных (`items`, `engine`): петля по
 *   `shown` (`TKeyedLoop`) строит `<label is="so-radio-group-item">` на каждый
 *   элемент, с инстансом данных и копией образца `item` в подписи.
 * - `item` — образец подписи радио из данных (`<template slot="item">`): scope
 *   у слотов Web Components нет, и копию одного образца получает каждое радио.
 *   Данные подпись берёт у элемента (`el.ctrl`).
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

/**
 * Копии образцов в радио из данных: слот группы → слот радио, как проброс у
 * остальных адаптеров (`setup/__tests__/item-slots.spec.ts`).
 */
export const RADIO_GROUP_ITEM_SLOTS: TItemSlots = { item: 'default' }

/** Петля радио из данных — только у группы без радио разметки. */
const loops = new WeakMap<HTMLElement, TKeyedLoop<IRadioGroupItem, number>>()

function isRadio(node: Element): node is TRadioGroupItemElementProps {
	return node instanceof TRadioGroupItemElement
}

/** Радио из данных: инстанс данных и копия подписи — до вставки. */
function radioOf(
	ctx: ITemplateContext<IRadioGroup, TRadioGroupCollectionFacade>,
	item: IRadioGroupItem,
): TRadioGroupItemElementProps {
	const radio = createItem(ctx.root.ownerDocument, 'label', 'so-radio-group-item', isRadio)

	radio.ctrl = item
	lendSamples(ctx, radio, RADIO_GROUP_ITEM_SLOTS)

	return radio
}

export const radioGroupTemplate: ITemplate<IRadioGroup, TRadioGroupCollectionFacade> = {
	create: (root, hasSlot) => {
		// Радио разметки — сами радио группы: петли из данных при них нет
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
