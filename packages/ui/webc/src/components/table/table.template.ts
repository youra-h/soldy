/**
 * Шаблон Table — таблица по паттернам APG Table и Sortable Table, как у Vue.
 *
 * Элемент — окно таблицы: `<div is="so-table">` с классом
 * `so-table__viewport`, внешний узел компонента. Класс и стиль потребителя и
 * скрытие — его, как у окна Vue и React. Корень — `table` внутри окна, его
 * строит шаблон (`TTemplateParts.root`): классы, наборы `attrs`, `aria` и
 * `dataset` (`data-overflow`, `data-sized`, `data-sticky-head`, в сетке —
 * роль `grid` и остановка Tab) база кладёт на него, с ним связывает
 * `TElementPlugin` и его тег отдаёт ядру. Тот же узел шаблон отдаёт базе
 * полем корня (`control`): на него база переносит статические атрибуты
 * разметки окна, кроме класса и стиля, — `aria-label` и `id` потребителя
 * называют таблицу. Окно обязательно: место под колонки плагин раскладки
 * мерит по родителю корня с этим классом, и в нём же тема прокручивает
 * таблицу вбок, когда колонки шире места.
 *
 * Логики в разметке нет: заголовки — показанные колонки коллекции
 * (`shownColumns`), тело — то, что рисует коллекция строк (`drawn`), число
 * колонок и счёт выбора — выходы коллекции. Колонки и строки задаются только
 * данными (`columns`, `items`, `engine`): частей разметкой у таблицы нет, и
 * слота по умолчанию тоже.
 *
 * - Шапка — `thead.so-table__head` со строкой `tr.so-table__head-row` и её
 *   набором `headRowAria` (у неё нет экземпляра — его держит коллекция; в окне
 *   это номер шапки среди строк таблицы).
 * - Первая ячейка шапки — колонка выбора, пока режим выбора не `none`. В
 *   `multiple` — `th.so-table__select` с чекбоксом «выбрать все»: деталь
 *   CheckBox `<span is="so-check-box" embedded="table.select-all">` над
 *   экземпляром, который держит таблица (`selectAll` фасада), имя — выход
 *   плагина имён (`names_selectAll`, строка локали). Связка без движка снаружи
 *   на каждое подключение собирает свой движок с новым экземпляром — и ячейка
 *   строится заново, как ключ чекбокса у React. В `single` — пустая
 *   `td.so-table__select`: пустой заголовок скринридеры считают ошибкой. Набор
 *   ячейки (`cellAria`) — коллекции: в сетке ячейка принимает фокус.
 * - Заголовки колонок — `<th is="so-table-column">` над экземпляром колонки,
 *   по одному на показанную колонку, петлёй по ключу колонки (`TKeyedLoop`).
 *   Подпись и кнопку сортировки рисует сама колонка, а таблица отдаёт ей
 *   только подпись — копию образца `header` в её слот `default`.
 * - Тело — `tbody.so-table__body`, одна петля по `drawn`, ключ — ключ записи:
 *   без окна это все показанные строки, в окне обёртки `<so-virtual>` —
 *   строки окна и распорки на месте пропущенных. Распорка —
 *   `tr.so-table__filler-row` под `aria-hidden` с одной ячейкой во всю ширину
 *   таблицы (`columnCount`), высоту и место которой тема берёт из её стиля, а
 *   стиль — из записи. Строка — `<tr is="so-table-row">` над элементом
 *   коллекции строк, с копией образца `cell` в её слоте `cell`: строка
 *   копирует его в каждую свою ячейку. Одна петля на строки и распорки:
 *   петли по видам переставляли бы строку, когда она переходит из одной в
 *   другую, и фокус в ней терялся бы.
 * - Пустое состояние — пока показанных строк нет: строка
 *   `tr.so-table__empty-row` с одной ячейкой на всю ширину таблицы
 *   (`colspan` — `columnCount`, готовое значение ядра), содержимое — слот
 *   `empty`. Без него ячейка пуста, и под шапкой остаётся пустая полоса.
 *   Строку выводит привязка: строки появились — пустая уходит из документа
 *   вместе со своим содержимым.
 * - `header` и `cell` — образцы (`<template slot="cell">`): scope у слотов Web
 *   Components нет, и копию одного образца получает каждый заголовок и каждая
 *   ячейка. Колонку копия заголовка находит у него (`el.ctrl`), строку копия
 *   ячейки — у строки, а колонку — по месту ячейки в показанных колонках
 *   (`shownColumns`).
 */

import type {
	ICheckBox,
	ITable,
	ITableColumn,
	ITableRow,
	TDrawnEntry,
	TTableCollectionFacade,
} from '@soldy-ui/core'
import type { TStateSnapshot } from '@soldy-ui/setup'
import {
	TKeyedLoop,
	bind,
	createDetail,
	createItem,
	lendSamples,
	lendTemplates,
	ownerAttributes,
	ownerStyles,
	type ITemplate,
	type ITemplateContext,
	type TItemSlots,
} from '../../adapter'
import { TCheckBoxElement, type TCheckBoxElementProps } from '../check-box'
import { TTableColumnElement, type TTableColumnElementProps } from './column'
import { TTableRowElement } from './row'

/**
 * Копии образцов в заголовки колонок: слот таблицы → слот заголовка, как
 * проброс у остальных адаптеров (`setup/__tests__/item-slots.spec.ts`).
 */
export const TABLE_COLUMN_SLOTS: TItemSlots = { header: 'default' }

/**
 * Копии образцов в строки: слот таблицы → слот строки, её образец ячейки.
 * Копия уходит строке `<template>` (`lendTemplates`): в самой строке она не
 * оживает, а в ячейки её копирует строка.
 */
export const TABLE_ROW_SLOTS: TItemSlots = { cell: 'cell' }

/** Контекст шаблона таблицы. */
type TTableContext = ITemplateContext<ITable, TTableCollectionFacade>

/** Запись того, что рисует тело: строка на своём месте или распорка. */
type TTableEntry = TDrawnEntry<ITableRow>

/** Узлы таблицы — одни на всё время жизни элемента. */
type TTableParts = {
	readonly headRow: HTMLTableRowElement
	readonly body: HTMLTableSectionElement
	/** Строка пустого состояния и её ячейка — в теле, пока строк нет. */
	readonly empty: HTMLTableRowElement
	readonly emptyCell: HTMLTableCellElement
	/** Заголовки колонок — по показанным колонкам. */
	readonly columns: TKeyedLoop<ITableColumn, number, TTableColumnElementProps>
	/** Строки и распорки — по записям рисования. */
	readonly rows: TKeyedLoop<TTableEntry, number, HTMLTableRowElement>
}

/**
 * Ячейка колонки выбора в шапке: `th` с чекбоксом «выбрать все» над своим
 * экземпляром в `multiple`, пустая `td` в `single`.
 */
type THeadSelect = {
	readonly cell: HTMLTableCellElement
	readonly checkBox: TCheckBoxElementProps | null
	readonly ctrl: ICheckBox | null
}

const parts = new WeakMap<HTMLElement, TTableParts>()

/** Ячейка колонки выбора каждой таблицы — пока режим выбора не `none`. */
const selects = new WeakMap<HTMLElement, THeadSelect>()

/**
 * Имя чекбокса «выбрать все» — выход плагина имён. Выходов плагинов в типе
 * состояния элемента нет, и выход читается по имени, как база читает выход
 * плагина раскладки; вид значения проверяется здесь.
 */
function selectAllLabel(state: TStateSnapshot): string | undefined {
	const label = state['names_selectAll']

	return typeof label === 'string' ? label : undefined
}

/** Ячейка колонки выбора: тег по режиму, чекбокс — над экземпляром таблицы. */
function headSelectOf(ctx: TTableContext, tag: 'th' | 'td', ctrl: ICheckBox | null): THeadSelect {
	const { ownerDocument } = ctx.root
	const cell = ownerDocument.createElement(tag)

	cell.className = 'so-table__select'

	if (!ctrl) return { cell, checkBox: null, ctrl }

	const checkBox = createDetail(ownerDocument, TCheckBoxElement, { embedded: 'table.select-all' })
	const label = selectAllLabel(ctx.state)

	// Экземпляр и имя — до вставки: сборка чекбокса берёт их при подключении
	checkBox.ctrl = ctrl

	if (label !== undefined) checkBox.aria_label = label

	cell.appendChild(checkBox)

	return { cell, checkBox, ctrl }
}

/** Заголовок колонки: экземпляр колонки и копия образца `header` — до вставки. */
function columnOf(ctx: TTableContext, column: ITableColumn): TTableColumnElementProps {
	const header = createItem(ctx.root.ownerDocument, TTableColumnElement)

	header.ctrl = column
	lendSamples(ctx, header, TABLE_COLUMN_SLOTS)

	return header
}

/** Стиль и ширина распорки — из её записи и числа колонок. */
function fillerOf(
	filler: HTMLTableRowElement,
	style: Readonly<Record<string, string>>,
	span: number,
) {
	ownerStyles(filler, style)

	const cell = filler.firstElementChild

	if (cell instanceof HTMLTableCellElement && cell.colSpan !== span) cell.colSpan = span
}

/**
 * Узел записи: строка — экземпляр строки и образец ячейки до вставки — или
 * распорка.
 */
function drawnOf(ctx: TTableContext, entry: TTableEntry, span: number): HTMLTableRowElement {
	const { ownerDocument } = ctx.root

	if (entry.kind === 'filler') {
		const filler = ownerDocument.createElement('tr')
		const cell = ownerDocument.createElement('td')

		filler.className = 'so-table__filler-row'
		filler.setAttribute('aria-hidden', 'true')
		cell.className = 'so-table__filler'
		filler.appendChild(cell)
		fillerOf(filler, entry.style, span)

		return filler
	}

	const row = createItem(ownerDocument, TTableRowElement)

	row.ctrl = entry.item
	lendTemplates(ctx, row, TABLE_ROW_SLOTS)

	return row
}

export const tableTemplate: ITemplate<ITable, TTableCollectionFacade> = {
	create: (root) => {
		const { ownerDocument } = root
		const table = ownerDocument.createElement('table')
		const head = ownerDocument.createElement('thead')
		const headRow = ownerDocument.createElement('tr')
		const body = ownerDocument.createElement('tbody')
		const empty = ownerDocument.createElement('tr')
		const emptyCell = ownerDocument.createElement('td')

		// Элемент — окно таблицы: класс окна стоит на нём с построения
		root.classList.add('so-table__viewport')
		head.className = 'so-table__head'
		headRow.className = 'so-table__head-row'
		body.className = 'so-table__body'
		empty.className = 'so-table__empty-row'
		emptyCell.className = 'so-table__empty'

		head.appendChild(headRow)
		empty.appendChild(emptyCell)
		// Пустая строка — в теле с построения: свет `empty` встаёт в неё, не
		// выходя из документа, а уберёт её первая отрисовка, если строки есть
		body.appendChild(empty)
		table.append(head, body)
		root.appendChild(table)

		parts.set(root, {
			headRow,
			body,
			empty,
			emptyCell,
			columns: new TKeyedLoop(headRow, null, (column: ITableColumn) => column.uid),
			rows: new TKeyedLoop(body, null, (entry: TTableEntry) => entry.key),
		})

		return {
			slots: {
				header: { mode: 'sample' },
				cell: { mode: 'sample' },
				empty: { mode: 'append', node: emptyCell },
			},
			root: table,
		}
	},

	bindings: [
		bind('headRowAria', ({ root, state }) => {
			const headRow = parts.get(root)?.headRow

			if (headRow) ownerAttributes(headRow, state.headRowAria)
		}),

		bind(['mode', 'cellAria', 'names_selectAll'], (ctx) => {
			const { root, state, facade } = ctx
			const own = parts.get(root)

			if (!own) return

			const tag = state.mode === 'multiple' ? 'th' : state.mode === 'single' ? 'td' : null
			// «Выбрать все» — экземпляр таблицы: у связки без движка снаружи он свой
			const ctrl = tag === 'th' ? (facade?.selectAll ?? null) : null
			let select = selects.get(root)

			if (select && (select.cell.localName !== tag || select.ctrl !== ctrl)) {
				select.cell.remove()
				selects.delete(root)
				select = undefined
			}

			if (tag === null) return

			if (!select) {
				select = headSelectOf(ctx, tag, ctrl)
				selects.set(root, select)
				// Заголовки колонок — за ней
				own.headRow.prepend(select.cell)
			} else if (select.checkBox) {
				const label = selectAllLabel(state)

				if (select.checkBox.aria_label !== label) select.checkBox.aria_label = label
			}

			ownerAttributes(select.cell, state.cellAria)
		}),

		bind('shownColumns', (ctx) => {
			parts
				.get(ctx.root)
				?.columns.draw(ctx.state.shownColumns ?? [], (column) => columnOf(ctx, column))
		}),

		bind(['drawn', 'columnCount'], (ctx) => {
			const span = ctx.state.columnCount ?? 1

			parts.get(ctx.root)?.rows.draw(
				ctx.state.drawn ?? [],
				(entry) => drawnOf(ctx, entry, span),
				// Живой записи — её стиль: строка всё берёт у своего экземпляра
				(node, entry) => {
					if (entry.kind === 'filler') fillerOf(node, entry.style, span)
				},
			)
		}),

		bind(['shown', 'columnCount'], ({ root, state }) => {
			const own = parts.get(root)

			if (!own) return

			const span = state.columnCount ?? 1

			if (own.emptyCell.colSpan !== span) own.emptyCell.colSpan = span

			if ((state.shown ?? []).length > 0) {
				own.empty.remove()
			} else if (own.empty.parentNode !== own.body) {
				own.body.appendChild(own.empty)
			}
		}),
	],
}
