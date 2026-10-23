/**
 * Шаблон ListBox.
 *
 * Корень — сам `<div is="so-list-box">`: классы, `attrs`, `dataset` и скрытие
 * раскладывает на него база (`ElementBase`). Корень — рамка: шапка, узел
 * списка (`div.so-list-box__list`) и подвал. Набор `aria` владельца — это сам
 * список (`role="listbox"`, `aria-multiselectable`, имя от `aria_label`), и на
 * узел списка его кладёт шаблон (`ownerAttributes`): в `listbox` ARIA пускает
 * только опции и группы, а шапка и подвал — место полей и кнопок. Узел списка
 * — и остановка Tab: по элементам ходят стрелки его клавиатуры
 * (`TListKeyboardPlugin`), и свои клавиши она берёт с этого узла. Поэтому
 * `tabindex="0"` шаблон ставит ему при построении, как статику разметки у Vue
 * и Angular. Узел списка шаблон отдаёт базе полем корня (`control`): на него
 * база переносит статические атрибуты разметки корня — уже после построения,
 * поэтому `tabindex` потребителя главнее статики шаблона.
 *
 * - `header` — перед узлом списка, `footer` — за ним, оба в корне.
 * - Элементы — слот `default`: элементы разметки `<div is="so-list-box-item">`
 *   и группы `<div is="so-list-box-group">` с элементами в них. В коллекцию
 *   элемент входит сам, когда собирается: движок списка он находит лифтом
 *   вверх по документу, и сквозь группу тоже.
 * - Без элементов разметки — то, что рисует коллекция, по секциям группировки
 *   (`drawnSections`): петля по ключу (`TKeyedLoop`) строит строки списка —
 *   группу с подписью (`<div is="so-list-box-group">`, её записи — своей
 *   петлёй внутри неё), записи без группы прямо в списке и немой разделитель
 *   (`div.so-list-box__separator` под `aria-hidden`, не `separator`: в
 *   `listbox` ARIA пускает только опции и группы) между соседними секциями,
 *   пока его просит список (`groupSeparators`: строки пересобирает и его
 *   смена). Секции идут порядком показанного, и стрелки ходят так же, как
 *   элементы стоят на экране; без групп секция одна — ни группы, ни
 *   разделителя. Запись
 *   элемента — `<div is="so-list-box-item">` с инстансом данных и копиями
 *   образцов `item-*`, а на месте пропущенных окном (у списка без групп) —
 *   распорка `div.so-list-box__filler` под `aria-hidden`, высоту и место
 *   которой тема берёт из её стиля, а стиль — из записи. Одна петля на
 *   элементы и распорки: петли по видам переставляли бы элемент, когда он
 *   переходит из одной в другую. Без окна записи — все показанные элементы.
 * - `empty` — пока показанных элементов нет, на их месте, внутри списка, как
 *   у Select: пустой `listbox` для скринридера — тупик. Выводит его привязка
 *   (`showSlot`).
 * - `item`, `item-leading`, `item-trailing`, `item-indicator-icon` — образцы
 *   слотов элементов из данных (`<template slot="item-leading">`): scope у
 *   слотов Web Components нет, и копию одного образца получает каждый элемент.
 *   Данные копия берёт у элемента (`el.ctrl`).
 *
 * Строки и `empty` стоят в узле списка перед концом элементов — узлом
 * шаблона, пустым комментарием: петля держит строки перед ним, и показанный
 * снова `empty` встаёт туда же, за элементы.
 */

import type {
	IListBox,
	IListBoxItem,
	TDrawnEntry,
	TDrawnSection,
	TListBoxCollectionFacade,
} from '@soldy-ui/core'
import {
	TKeyedLoop,
	bind,
	createItem,
	lendSamples,
	ownerAttributes,
	ownerStyles,
	type ITemplate,
	type ITemplateContext,
	type TItemSlots,
} from '../../adapter'
import { TListBoxItemElement, type TListBoxItemElementProps } from './item'
import { TListBoxGroupElement, type TListBoxGroupElementProps } from './group'

/**
 * Копии образцов в элементы из данных: слот списка → слот элемента, как
 * проброс у остальных адаптеров (`setup/__tests__/item-slots.spec.ts`).
 */
export const LIST_BOX_ITEM_SLOTS: TItemSlots = {
	'item-leading': 'leading',
	item: 'default',
	'item-trailing': 'trailing',
	'item-indicator-icon': 'indicator-icon',
}

/** Запись того, что рисует список: элемент на своём месте или распорка. */
type TListBoxEntry = TDrawnEntry<IListBoxItem>

/** Секция того, что рисует список: записи одной группы. */
type TListBoxSection = TDrawnSection<IListBoxItem>

/**
 * Строка узла списка: разделитель перед секцией, группа с её записями или
 * запись без группы. Ключи у видов не пересекаются: у записи — её ключ
 * (число), у группы — ключ секции, у разделителя — свой от ключа секции.
 */
type TListBoxRow =
	| { readonly kind: 'separator'; readonly key: string }
	| { readonly kind: 'group'; readonly key: string; readonly section: TListBoxSection }
	| TListBoxEntry

/** Узел списка каждого ListBox — один на всё время жизни элемента. */
const lists = new WeakMap<HTMLElement, HTMLElement>()

/** Петля строк — только у списка без элементов разметки. */
const loops = new WeakMap<HTMLElement, TKeyedLoop<TListBoxRow, string | number, HTMLElement>>()

/** Петля записей каждой группы из данных — внутри группы. */
const groupLoops = new WeakMap<HTMLElement, TKeyedLoop<TListBoxEntry, number, HTMLElement>>()

/**
 * Строки списка по секциям: разделитель — перед всеми, кроме первой, пока
 * список их просит (`separated`).
 */
function rowsOf(sections: ReadonlyArray<TListBoxSection>, separated: boolean): TListBoxRow[] {
	return sections.flatMap((section, index): TListBoxRow[] => [
		...(separated && index > 0
			? [{ kind: 'separator' as const, key: `separator:${section.key}` }]
			: []),
		...(section.group
			? [{ kind: 'group' as const, key: section.key, section }]
			: section.entries),
	])
}

/** Узел записи: элемент из данных — инстанс данных и копии образцов до вставки — или распорка. */
function drawnOf(
	ctx: ITemplateContext<IListBox, TListBoxCollectionFacade>,
	entry: TListBoxEntry,
): HTMLElement {
	const { ownerDocument } = ctx.root

	if (entry.kind === 'filler') {
		const filler = ownerDocument.createElement('div')

		filler.className = 'so-list-box__filler'
		filler.setAttribute('aria-hidden', 'true')
		// Высота пропущенных и место в составе — из записи
		ownerStyles(filler, entry.style)

		return filler
	}

	const item = createItem(ownerDocument, TListBoxItemElement)

	item.ctrl = entry.item
	lendSamples(ctx, item, LIST_BOX_ITEM_SLOTS)

	return item
}

/** Живой записи — её стиль: элемент из данных всё берёт у своего инстанса. */
function updateDrawn(node: HTMLElement, entry: TListBoxEntry): void {
	if (entry.kind === 'filler') ownerStyles(node, entry.style)
}

/**
 * Подпись и записи группы — по её секции. Записи — своей петлёй внутри
 * группы: в конце её корня, за подписью. Новая группа ещё не в документе, и
 * записи становятся её светом — база группы раскладывает их в слот по
 * умолчанию, когда группа собирается.
 */
function fillGroup(
	ctx: ITemplateContext<IListBox, TListBoxCollectionFacade>,
	group: TListBoxGroupElementProps,
	section: TListBoxSection,
): void {
	group.label = section.group?.label

	let loop = groupLoops.get(group)

	if (!loop) {
		loop = new TKeyedLoop(group, null, (entry: TListBoxEntry) => entry.key)
		groupLoops.set(group, loop)
	}

	loop.draw(section.entries, (entry) => drawnOf(ctx, entry), updateDrawn)
}

/** Узел строки: разделитель, группа с записями или запись без группы. */
function rowOf(
	ctx: ITemplateContext<IListBox, TListBoxCollectionFacade>,
	row: TListBoxRow,
): HTMLElement {
	if (row.kind === 'separator') {
		const separator = ctx.root.ownerDocument.createElement('div')

		separator.className = 'so-list-box__separator'
		separator.setAttribute('aria-hidden', 'true')

		return separator
	}

	if (row.kind === 'group') {
		const group = createItem(ctx.root.ownerDocument, TListBoxGroupElement)

		fillGroup(ctx, group, row.section)

		return group
	}

	return drawnOf(ctx, row)
}

/** Живой строке — её запись: группе — подпись и записи, распорке — стиль. */
function updateRow(
	ctx: ITemplateContext<IListBox, TListBoxCollectionFacade>,
	node: HTMLElement,
	row: TListBoxRow,
): void {
	if (row.kind === 'separator') return

	if (row.kind === 'group') {
		if (TListBoxGroupElement.is(node)) fillGroup(ctx, node, row.section)

		return
	}

	updateDrawn(node, row)
}

export const listBoxTemplate: ITemplate<IListBox, TListBoxCollectionFacade> = {
	create: (root, { hasSlot }) => {
		const { ownerDocument } = root
		const list = ownerDocument.createElement('div')
		const end = ownerDocument.createComment('')

		list.className = 'so-list-box__list'
		list.setAttribute('tabindex', '0')
		list.appendChild(end)
		root.appendChild(list)

		// Элементы разметки — сами элементы списка: петли из данных при них нет
		if (!hasSlot('default')) {
			loops.set(root, new TKeyedLoop(list, end, (row: TListBoxRow) => row.key))
		}

		lists.set(root, list)

		return {
			slots: {
				header: { mode: 'before', node: list },
				default: { mode: 'before', node: end },
				empty: { mode: 'before', node: end },
				footer: { mode: 'append', node: root },
				item: { mode: 'sample' },
				'item-leading': { mode: 'sample' },
				'item-trailing': { mode: 'sample' },
				'item-indicator-icon': { mode: 'sample' },
			},
			control: list,
		}
	},

	bindings: [
		bind('aria', ({ root, state }) => {
			const list = lists.get(root)

			if (list) ownerAttributes(list, state.aria)
		}),

		bind(['drawnSections', 'groupSeparators'], (ctx) => {
			loops.get(ctx.root)?.draw(
				rowsOf(ctx.state.drawnSections ?? [], ctx.state.groupSeparators === true),
				(row) => rowOf(ctx, row),
				(node, row) => updateRow(ctx, node, row),
			)
		}),

		bind('shown', ({ state, showSlot }) => {
			showSlot('empty', (state.shown ?? []).length === 0)
		}),
	],
}
