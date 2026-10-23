/**
 * Шаблон Table — APG Table и Sortable Table. Корень — `table` в окне-элементе
 * и его поле; заголовки и строки с распорками — петлями по ключу, образцы
 * `header` и `cell` — копиями. docs/architecture.md, Layer 8d, «Коллекция».
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
	patch,
} from '../../adapter'
import { TCheckBoxElement, type TCheckBoxElementProps } from '../check-box'
import { TTableColumnElement, type TTableColumnElementProps } from './column'
import { TTableRowElement } from './row'

/** Слот таблицы → слот заголовка; сверяет `setup/__tests__/item-slots.spec.ts`. */
export const TABLE_COLUMN_SLOTS: TItemSlots = { header: 'default' }

/** Образец ячейки уходит строке `<template>`: в строке не оживает, в ячейки его копирует она. */
export const TABLE_ROW_SLOTS: TItemSlots = { cell: 'cell' }

type TTableContext = ITemplateContext<ITable, TTableCollectionFacade>

type TTableEntry = TDrawnEntry<ITableRow>

type TTableParts = {
	readonly headRow: HTMLTableRowElement
	readonly body: HTMLTableSectionElement
	readonly empty: HTMLTableRowElement
	readonly emptyCell: HTMLTableCellElement
	readonly columns: TKeyedLoop<ITableColumn, number, TTableColumnElementProps>
	/** Строки и распорки — одной петлёй: при двух строка, сменив вид, переезжала бы и теряла фокус. */
	readonly rows: TKeyedLoop<TTableEntry, number, HTMLTableRowElement>
}

type THeadSelect = {
	readonly cell: HTMLTableCellElement
	readonly checkBox: TCheckBoxElementProps | null
	readonly ctrl: ICheckBox | null
}

const parts = new WeakMap<HTMLElement, TTableParts>()

const selects = new WeakMap<HTMLElement, THeadSelect>()

/** Выход плагина имён: в типе состояния его нет, и вид значения проверяется здесь. */
function selectAllLabel(state: TStateSnapshot): string | undefined {
	const label = state['names_selectAll']

	return typeof label === 'string' ? label : undefined
}

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

function columnOf(ctx: TTableContext, column: ITableColumn): TTableColumnElementProps {
	const header = createItem(ctx.root.ownerDocument, TTableColumnElement)

	header.ctrl = column
	lendSamples(ctx, header, TABLE_COLUMN_SLOTS)

	return header
}

function fillerOf(
	filler: HTMLTableRowElement,
	style: Readonly<Record<string, string>>,
	span: number,
) {
	ownerStyles(filler, style)

	const cell = filler.firstElementChild

	if (cell instanceof HTMLTableCellElement && cell.colSpan !== span) cell.colSpan = span
}

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

		// Окно обязательно: по нему плагин раскладки мерит место колонок, тема прокручивает вбок
		root.classList.add('so-table__viewport')
		head.className = 'so-table__head'
		headRow.className = 'so-table__head-row'
		body.className = 'so-table__body'
		empty.className = 'so-table__empty-row'
		emptyCell.className = 'so-table__empty'

		head.appendChild(headRow)
		empty.appendChild(emptyCell)
		// В теле с построения: свет `empty` встаёт в неё, не выходя из документа
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

			// `td` в `single`: пустой заголовок скринридеры считают ошибкой
			const tag = state.mode === 'multiple' ? 'th' : state.mode === 'single' ? 'td' : null
			// У связки без движка снаружи экземпляр свой: сменился — ячейка строится заново
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
				own.headRow.prepend(select.cell)
			} else if (select.checkBox) {
				const label = selectAllLabel(state)

				patch(select.checkBox, { aria_label: label })
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
				// Живой распорке — стиль её новой записи
				(node, entry) => {
					if (entry.kind === 'filler') fillerOf(node, entry.style, span)
				},
			)
		}),

		bind(['shown', 'columnCount'], ({ root, state }) => {
			const own = parts.get(root)

			if (!own) return

			const span = state.columnCount ?? 1

			patch(own.emptyCell, { colSpan: span })

			if ((state.shown ?? []).length > 0) {
				own.empty.remove()
			} else if (own.empty.parentNode !== own.body) {
				own.body.appendChild(own.empty)
			}
		}),
	],
}
