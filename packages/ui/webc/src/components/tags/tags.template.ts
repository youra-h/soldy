/**
 * Шаблон Tags.
 *
 * Корень — сам `<div is="so-tags">`, ряд тегов: классы (вид набора —
 * модификатором, по нему тема рисует пилюлю каждого тега), три набора ядра —
 * роль `list` или `listbox` с `aria-orientation` и `aria-multiselectable` по
 * режиму выбора, `data-overflow` для темы — и скрытие раскладывает на него
 * база (`ElementBase`), как у Vue. Своей разметки у набора нет — только теги:
 * раскладка ряда (перенос, прокрутка) — дело темы по `data-overflow`, а тег под
 * фокусом в окно ряда, который прокручивается, доводит плагин
 * (`TTagsScrollPlugin`).
 *
 * - Теги — слот `default`: элементы разметки `<div is="so-tags-item">` — или
 *   своя раскладка с ними, в ленту или в ряд с хвостом в панели: каждый тег
 *   стоит в ней один раз, и движок набора он находит лифтом вверх по
 *   документу.
 * - Без тегов разметки — теги из данных (`items`, `engine`): петля по `shown`
 *   (`TKeyedLoop`, ключ — `uid`) строит `<div is="so-tags-item">` на каждый
 *   показанный тег, с инстансом данных и копиями образцов `item-*`. `shown`, а
 *   не `items`: скрытый отбором тег снимается, но из коллекции не уходит.
 * - `item`, `item-leading`, `item-trailing`, `item-close-icon` — образцы
 *   слотов тегов из данных (`<template slot="item-leading">`): scope у слотов
 *   Web Components нет, и копию одного образца получает каждый тег. Данные
 *   копия берёт у тега (`el.ctrl`). Образца крестика нет — тег рисует свою
 *   иконку.
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
import { TTagsItemElement, type TTagsItemElementProps } from './item'

/**
 * Копии образцов в теги из данных: слот набора → слот тега, как проброс у
 * остальных адаптеров (`setup/__tests__/item-slots.spec.ts`).
 */
export const TAGS_ITEM_SLOTS: TItemSlots = {
	'item-leading': 'leading',
	item: 'default',
	'item-trailing': 'trailing',
	'item-close-icon': 'close-icon',
}

/** Петля тегов из данных — только у набора без тегов разметки. */
const loops = new WeakMap<HTMLElement, TKeyedLoop<ITagsItem, number>>()

/** Тег из данных: инстанс данных и копии образцов — до вставки. */
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
