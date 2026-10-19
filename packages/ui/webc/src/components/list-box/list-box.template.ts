/**
 * Шаблон ListBox.
 *
 * Корень — сам `<div is="so-list-box">`: классы, `attrs`, `dataset` и скрытие
 * раскладывает на него база (`SoldyElement`). Корень — рамка: шапка, узел
 * списка (`div.so-list-box__list`) и подвал. Набор `aria` владельца — это сам
 * список (`role="listbox"`, `aria-multiselectable`, имя от `aria_label`), и на
 * узел списка его кладёт шаблон (`ownerAttributes`): в `listbox` ARIA пускает
 * только опции, а шапка и подвал — место полей и кнопок. Узел списка — и
 * остановка Tab: по элементам ходят стрелки его клавиатуры
 * (`TListKeyboardPlugin`), и свои клавиши она берёт с этого узла. Поэтому
 * `tabindex="0"` шаблон ставит ему при построении, как статику разметки у Vue
 * и Angular.
 *
 * - `header` — перед узлом списка, `footer` — за ним, оба в корне.
 * - Элементы — слот `default`: элементы разметки `<div is="so-list-box-item">`.
 *   В коллекцию элемент входит сам, когда собирается: движок списка он
 *   находит лифтом вверх по документу.
 * - Без элементов разметки — то, что рисует коллекция (`drawn`): петля по
 *   ключу записи (`TKeyedLoop`) строит `<div is="so-list-box-item">` на каждую
 *   запись элемента, с инстансом данных и копиями образцов `item-*`, а на месте
 *   пропущенных окном — распорку `div.so-list-box__filler` под `aria-hidden`,
 *   высоту и место которой тема берёт из её стиля, а стиль — из записи. Одна
 *   петля на элементы и распорки: петли по видам переставляли бы элемент,
 *   когда он переходит из одной в другую. Без окна записи — все показанные
 *   элементы.
 * - `empty` — пока показанных элементов нет, на их месте, внутри списка, как
 *   у Select: пустой `listbox` для скринридера — тупик. Выводит его привязка
 *   (`showSlot`).
 * - `item`, `item-leading`, `item-trailing`, `item-indicator-icon` — образцы
 *   слотов элементов из данных (`<template slot="item-leading">`): scope у
 *   слотов Web Components нет, и копию одного образца получает каждый элемент.
 *   Данные копия берёт у элемента (`el.ctrl`).
 *
 * Элементы и `empty` стоят в узле списка перед концом элементов — узлом
 * шаблона, пустым комментарием: петля держит элементы перед ним, и показанный
 * снова `empty` встаёт туда же, за элементы.
 */

import type { IListBox, IListBoxItem, TDrawnEntry, TListBoxCollectionFacade } from '@soldy-ui/core'
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
import { TListBoxItemElement, type TListBoxItemElementProps } from './item'

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

/** Узел списка каждого ListBox — один на всё время жизни элемента. */
const lists = new WeakMap<HTMLElement, HTMLElement>()

/** Петля записей рисования — только у списка без элементов разметки. */
const loops = new WeakMap<HTMLElement, TKeyedLoop<TListBoxEntry, number, HTMLElement>>()

function isItem(node: Element): node is TListBoxItemElementProps {
	return node instanceof TListBoxItemElement
}

/**
 * Стиль распорки — из её записи: высота пропущенных и место в составе. Узел —
 * шаблона, и другого стиля у него нет: запись его и задаёт целиком.
 */
function styleFiller(filler: HTMLElement, style: Readonly<Record<string, string>>): void {
	filler.removeAttribute('style')

	for (const [name, value] of Object.entries(style)) filler.style.setProperty(name, value)
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
		styleFiller(filler, entry.style)

		return filler
	}

	const item = createItem(ownerDocument, 'div', 'so-list-box-item', isItem)

	item.ctrl = entry.item
	lendSamples(ctx, item, LIST_BOX_ITEM_SLOTS)

	return item
}

/** Живой записи — её стиль: элемент из данных всё берёт у своего инстанса. */
function updateDrawn(node: HTMLElement, entry: TListBoxEntry): void {
	if (entry.kind === 'filler') styleFiller(node, entry.style)
}

export const listBoxTemplate: ITemplate<IListBox, TListBoxCollectionFacade> = {
	create: (root, hasSlot) => {
		const { ownerDocument } = root
		const list = ownerDocument.createElement('div')
		const end = ownerDocument.createComment('')

		list.className = 'so-list-box__list'
		list.setAttribute('tabindex', '0')
		list.appendChild(end)
		root.appendChild(list)

		// Элементы разметки — сами элементы списка: петли из данных при них нет
		if (!hasSlot('default')) {
			loops.set(root, new TKeyedLoop(list, end, (entry: TListBoxEntry) => entry.key))
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
		}
	},

	bindings: [
		bind('aria', ({ root, state }) => {
			const list = lists.get(root)

			if (list) ownerAttributes(list, state.aria)
		}),

		bind('drawn', (ctx) => {
			loops
				.get(ctx.root)
				?.draw(ctx.state.drawn ?? [], (entry) => drawnOf(ctx, entry), updateDrawn)
		}),

		bind('shown', ({ state, showSlot }) => {
			showSlot('empty', (state.shown ?? []).length === 0)
		}),
	],
}
