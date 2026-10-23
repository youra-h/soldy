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

import type { IListBox, IListBoxItem, TListBoxCollectionFacade } from '@soldy-ui/core'
import { bind, ownerAttributes, type ITemplate, type TItemSlots } from '../../adapter'
import { TDrawnRows, type TDrawnRowsSpec } from '../common/drawn-rows'
import { TListBoxItemElement } from './item'
import { TListBoxGroupElement } from './group'

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

const ROWS: TDrawnRowsSpec<IListBoxItem> = {
	block: 'list-box',
	item: TListBoxItemElement,
	group: TListBoxGroupElement,
	slots: LIST_BOX_ITEM_SLOTS,
}

/** Узел списка каждого ListBox — один на всё время жизни элемента. */
const lists = new WeakMap<HTMLElement, HTMLElement>()

/** Строки — только у списка без элементов разметки. */
const rows = new WeakMap<HTMLElement, TDrawnRows<IListBoxItem>>()

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
			rows.set(root, new TDrawnRows(list, end, ROWS))
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
			rows.get(ctx.root)?.draw(
				ctx,
				ctx.state.drawnSections,
				ctx.state.groupSeparators === true,
			)
		}),

		bind('shown', ({ state, showSlot }) => {
			showSlot('empty', (state.shown ?? []).length === 0)
		}),
	],
}
