/**
 * Пункты из данных — одна разметка у меню и подменю: петли по секциям, группа,
 * разделитель, подменю по записи `submenus`. docs/architecture.md, Layer 8d,
 * «Меню».
 *
 * Вид пункта — в ключе строки: патч вид не меняет, а запись подменю у пункта
 * устойчива — подменю то же, пока жив его пункт.
 */

import type {
	IMenuItem,
	TGroupSection,
	TMenuSubmenuEntries,
	TMenuSubmenuEntry,
} from '@soldy-ui/core'
import {
	TKeyedLoop,
	createItem,
	lendSamples,
	lendTemplates,
	type ITemplateContext,
	type TItemSlots,
} from '../../adapter'
import { TMenuItemElement } from './item'
import { TMenuGroupElement, type TMenuGroupElementProps } from './group'
import { TMenuSeparatorElement } from './separator'
import { TMenuSubmenuElement } from './submenu/MenuSubmenu.element'

/** Слот владельца → слот действия, как проброс у остальных адаптеров (`item-slots.spec.ts`). */
export const MENU_ITEM_SLOTS: TItemSlots = {
	'item-leading': 'leading',
	item: 'default',
	'item-trailing': 'trailing',
}

export const MENU_SUBMENU_SLOTS: TItemSlots = {
	'item-leading': 'leading',
	'item-header': 'header',
	'item-arrow-icon': 'arrow-icon',
	'item-content': 'default',
}

/**
 * Образцы владельца — подменю из данных под теми же именами: слоты одни на все
 * уровни. Копия уходит в `<template>`: в самом подменю она не оживает.
 */
export const MENU_SUBMENU_TEMPLATES: TItemSlots = {
	item: 'item',
	'item-leading': 'item-leading',
	'item-trailing': 'item-trailing',
	'item-header': 'item-header',
	'item-arrow-icon': 'item-arrow-icon',
	'item-content': 'item-content',
}

type TMenuSection = TGroupSection<IMenuItem>

type TItemRow =
	| { readonly kind: 'item'; readonly key: string; readonly item: IMenuItem }
	| { readonly kind: 'submenu'; readonly key: string; readonly entry: TMenuSubmenuEntry }

/** Ключи у видов не пересекаются: у группы — ключ секции, у пункта — вид и `uid`. */
type TMenuRow =
	| { readonly kind: 'separator'; readonly key: string }
	| { readonly kind: 'group'; readonly key: string; readonly section: TMenuSection }
	| TItemRow

type TItemsContext = Pick<ITemplateContext, 'root' | 'sample'>

/** Петля строк — только у владельца без пунктов разметки. */
const loops = new WeakMap<HTMLElement, TKeyedLoop<TMenuRow, string, HTMLElement>>()

const groupLoops = new WeakMap<HTMLElement, TKeyedLoop<TItemRow, string, HTMLElement>>()

/** Заводит шаблон владельца без слота `default`: разметка заменяет данные, как слот у Vue. */
export function drawItemsIn(root: HTMLElement, list: HTMLElement): void {
	loops.set(root, new TKeyedLoop(list, null, (row: TMenuRow) => row.key))
}

function itemRowOf(item: IMenuItem, submenus: TMenuSubmenuEntries | undefined): TItemRow {
	const entry = submenus?.get(item)

	return entry
		? { kind: 'submenu', key: `submenu:${item.uid}`, entry }
		: { kind: 'item', key: `item:${item.uid}`, item }
}

/** Разделитель — перед каждой секцией, кроме первой, пока владелец их просит. */
function rowsOf(
	sections: ReadonlyArray<TMenuSection>,
	submenus: TMenuSubmenuEntries | undefined,
	separated: boolean,
): TMenuRow[] {
	return sections.flatMap((section, index): TMenuRow[] => [
		...(separated && index > 0
			? [{ kind: 'separator' as const, key: `separator:${section.key}` }]
			: []),
		...(section.group
			? [{ kind: 'group' as const, key: section.key, section }]
			: section.items.map((item) => itemRowOf(item, submenus))),
	])
}

/** Данные и копии образцов — до вставки: сборка берёт их при подключении. */
function itemOf(ctx: TItemsContext, row: TItemRow): HTMLElement {
	const { ownerDocument } = ctx.root

	if (row.kind === 'submenu') {
		const submenu = createItem(ownerDocument, TMenuSubmenuElement)

		submenu.ctrl = row.entry.ctrl
		submenu.engine = row.entry.engine
		lendSamples(ctx, submenu, MENU_SUBMENU_SLOTS)
		lendTemplates(ctx, submenu, MENU_SUBMENU_TEMPLATES)

		return submenu
	}

	const item = createItem(ownerDocument, TMenuItemElement)

	item.ctrl = row.item
	lendSamples(ctx, item, MENU_ITEM_SLOTS)

	return item
}

/**
 * Пункты — своей петлёй в конце корня группы, за подписью. Новая группа ещё не
 * в документе: пункты — её свет, и в слот их разложит база при сборке.
 */
function fillGroup(
	ctx: TItemsContext,
	group: TMenuGroupElementProps,
	section: TMenuSection,
	submenus: TMenuSubmenuEntries | undefined,
): void {
	group.label = section.group?.label

	let loop = groupLoops.get(group)

	if (!loop) {
		loop = new TKeyedLoop(group, null, (row: TItemRow) => row.key)
		groupLoops.set(group, loop)
	}

	loop.draw(
		section.items.map((item) => itemRowOf(item, submenus)),
		(row) => itemOf(ctx, row),
	)
}

function rowOf(
	ctx: TItemsContext,
	row: TMenuRow,
	submenus: TMenuSubmenuEntries | undefined,
): HTMLElement {
	const { ownerDocument } = ctx.root

	if (row.kind === 'separator') {
		return createItem(ownerDocument, TMenuSeparatorElement)
	}

	if (row.kind === 'group') {
		const group = createItem(ownerDocument, TMenuGroupElement)

		fillGroup(ctx, group, row.section, submenus)

		return group
	}

	return itemOf(ctx, row)
}

/** Живую строку обновляет только группа: пункт берёт всё у своего инстанса. */
export function drawItems(
	ctx: TItemsContext,
	sections: ReadonlyArray<TMenuSection> | undefined,
	submenus: TMenuSubmenuEntries | undefined,
	separated: boolean,
): void {
	loops.get(ctx.root)?.draw(
		rowsOf(sections ?? [], submenus, separated),
		(row) => rowOf(ctx, row, submenus),
		(node, row) => {
			if (row.kind === 'group' && node instanceof TMenuGroupElement)
				fillGroup(ctx, node, row.section, submenus)
		},
	)
}
