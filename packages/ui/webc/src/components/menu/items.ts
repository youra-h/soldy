/**
 * Пункты из данных — одна разметка у меню и подменю, как `drawItems` у Solid:
 * у Vue её четыре копии только из-за шаблонов. Подменю рисует ею свои уровни
 * само.
 *
 * Петля — по секциям показанных пунктов (`sections`), строками списка
 * (`div.so-menu__list`): группа с подписью — `<div is="so-menu-group">`, её
 * пункты — своей петлёй внутри неё, пункты без группы — прямо в списке, а
 * между соседними секциями, пока его просит владелец (`groupSeparators`: строки
 * пересобирает и его смена), — разделитель `<div is="so-menu-separator">`.
 * Секции идут порядком показанного, поэтому стрелки ходят так же, как пункты
 * стоят на экране; без групп секция одна — ни обёртки, ни разделителя. Группа
 * и разделитель — части меню из его же разметки, как у Vue `MenuGroup` и
 * `MenuSeparator`: без `embedded`, а события их не всплывают (`createItem`).
 *
 * Пункт с вложенным `items` — подменю из данных: коллекция отдаёт его запись
 * (`submenus`), и она ложится в `ctrl` и `engine`
 * `<div is="so-menu-submenu">` — пункт и движок его пунктов, — тем же входом,
 * что у подменю разметкой с движком снаружи. Остальные — действия
 * `<div is="so-menu-item">` с инстансом данных. Вид пункта — в ключе строки:
 * патч вид пункта не меняет, а запись подменю у пункта устойчива — подменю
 * то же, пока жив его пункт.
 *
 * Слоты пунктов из данных — образцы `item-*` владельца (`<template
 * slot="item-leading">`): scope у слотов Web Components нет, и копию одного
 * образца получает каждый пункт — в свой слот, по таблице пробросов
 * (`setup/__tests__/item-slots.spec.ts`). Действию — `item-leading`, `item` и
 * `item-trailing`; подменю — `item-leading`, `item-header`, `item-arrow-icon`
 * в слоты строки и `item-content` в слот `default`, его панель (пусто — подменю
 * рисует свои пункты из данных), а свои `item` и `item-*` владелец отдаёт
 * подменю под теми же именами — образцами в `<template>` (`lendTemplates`):
 * слоты одни на все уровни. Данные копия берёт у пункта (`el.ctrl`).
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

/**
 * Копии образцов в действие из данных: слот владельца → слот пункта, как
 * проброс у остальных адаптеров (`setup/__tests__/item-slots.spec.ts`).
 */
export const MENU_ITEM_SLOTS: TItemSlots = {
	'item-leading': 'leading',
	item: 'default',
	'item-trailing': 'trailing',
}

/** Копии образцов в слоты подменю из данных: строка и его панель (`item-content`). */
export const MENU_SUBMENU_SLOTS: TItemSlots = {
	'item-leading': 'leading',
	'item-header': 'header',
	'item-arrow-icon': 'arrow-icon',
	'item-content': 'default',
}

/**
 * Образцы владельца — образцами подменю из данных, под теми же именами: подменю
 * копирует их в свои пункты из данных, и слоты одни на все уровни. Копия
 * уходит подменю `<template>` (`lendTemplates`): в самом подменю она не
 * оживает.
 */
export const MENU_SUBMENU_TEMPLATES: TItemSlots = {
	item: 'item',
	'item-leading': 'item-leading',
	'item-trailing': 'item-trailing',
	'item-header': 'item-header',
	'item-arrow-icon': 'item-arrow-icon',
	'item-content': 'item-content',
}

/** Секция показанных пунктов: группа с подписью или пункты без группы. */
type TMenuSection = TGroupSection<IMenuItem>

/** Пункт строкой: действие или подменю из данных со своей записью. */
type TItemRow =
	| { readonly kind: 'item'; readonly key: string; readonly item: IMenuItem }
	| { readonly kind: 'submenu'; readonly key: string; readonly entry: TMenuSubmenuEntry }

/**
 * Строка списка: разделитель перед секцией, группа с её пунктами или пункт без
 * группы. Ключи у видов не пересекаются: у группы — ключ секции (`group:…`), у
 * разделителя — свой от ключа секции, у пункта — его вид и `uid`.
 */
type TMenuRow =
	| { readonly kind: 'separator'; readonly key: string }
	| { readonly kind: 'group'; readonly key: string; readonly section: TMenuSection }
	| TItemRow

/** Что из контекста шаблона нужно разметке пунктов: корень и копии образцов. */
type TItemsContext = Pick<ITemplateContext, 'root' | 'sample'>

/** Петля строк — только у владельца без пунктов разметки. */
const loops = new WeakMap<HTMLElement, TKeyedLoop<TMenuRow, string, HTMLElement>>()

/** Петля пунктов каждой группы из данных — внутри группы. */
const groupLoops = new WeakMap<HTMLElement, TKeyedLoop<TItemRow, string, HTMLElement>>()

/**
 * Петля пунктов из данных — в списке владельца `root`. Заводит её шаблон
 * владельца, только когда пункты не заданы разметкой (слот `default`):
 * разметка заменяет данные, как слот у Vue.
 */
export function drawItemsIn(root: HTMLElement, list: HTMLElement): void {
	loops.set(root, new TKeyedLoop(list, null, (row: TMenuRow) => row.key))
}

/** Пункт строкой: подменю, если коллекция завела ему запись, иначе действие. */
function itemRowOf(item: IMenuItem, submenus: TMenuSubmenuEntries | undefined): TItemRow {
	const entry = submenus?.get(item)

	return entry
		? { kind: 'submenu', key: `submenu:${item.uid}`, entry }
		: { kind: 'item', key: `item:${item.uid}`, item }
}

/**
 * Строки списка по секциям: разделитель — перед всеми, кроме первой, пока
 * владелец их просит (`separated`).
 */
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

/**
 * Узел пункта: действие с инстансом данных или подменю с записью — и копии
 * образцов, всё до вставки: сборка берёт их при подключении.
 */
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
 * Подпись и пункты группы — по её секции. Пункты — своей петлёй внутри
 * группы: в конце её корня, за подписью. Новая группа ещё не в документе, и
 * пункты становятся её светом — база группы раскладывает их в слот по
 * умолчанию, когда группа собирается.
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

/** Узел строки: разделитель, группа с пунктами или пункт без группы. */
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

/**
 * Пункты из данных по секциям — в списке владельца, если петля у него есть:
 * пунктов разметки нет. Живой группе — подпись и пункты её секции; пункт
 * берёт всё у своего инстанса, и запись ему не нужна.
 */
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
			if (row.kind === 'group' && TMenuGroupElement.is(node))
				fillGroup(ctx, node, row.section, submenus)
		},
	)
}
