import '@ui5/webcomponents/dist/Table.js'
import '@ui5/webcomponents/dist/TableHeaderRow.js'
import '@ui5/webcomponents/dist/TableHeaderCell.js'
import '@ui5/webcomponents/dist/TableRow.js'
import '@ui5/webcomponents/dist/TableCell.js'
import '@ui5/webcomponents/dist/TableSelectionMulti.js'
import type { TShown } from '../../bench'
import { COLUMNS, type TRec } from '../data'
import { nextSort, sorted, type TSort } from '../sort'
import { TKeyedRows, writeCells } from './keyed'
import { inShadow } from './shadow'

const tableRows = () => [...document.querySelectorAll('ui5-table > ui5-table-row')]

export const sel = {
	// Клик `ui5-checkbox` слушает его корень в тени, а не сам элемент
	selectAll: () => inShadow('ui5-table-header-row', 'ui5-checkbox', '.ui5-checkbox-root'),
	sort: 'ui5-table-header-cell[data-col="name"]',
	shown: (): TShown => ({
		rows: tableRows().length,
		checked: tableRows().filter((row) =>
			row.shadowRoot?.querySelector('ui5-checkbox')?.hasAttribute('checked'),
		).length,
		first: document
			.querySelector('ui5-table > ui5-table-row ui5-table-cell')
			?.textContent?.trim(),
	}),
}

/**
 * UI5 `ui5-table` (`@ui5/webcomponents`), тема по умолчанию (Horizon): строки —
 * разметкой приложения (`ui5-table-row` по `row-key`), выбор с чекбоксом
 * «выбрать все» в шапке встроен (`ui5-table-selection-multi`). Сортировку
 * таблица только показывает (`sortIndicator` заголовка), строки по клику на
 * заголовок переставляет приложение — так в документации. Строки сверяются по
 * `id` (`TKeyedRows`) и лежат в свете таблицы первыми: шапка и выбор — в своих
 * слотах после них, и порядок строк от них не зависит. Окно таблицы
 * (`TableVirtualizer`) — экспериментальное, в замер не идёт.
 */
let table: HTMLElement | null = null
let rows: TKeyedRows<HTMLElement> | null = null
let data: TRec[] = []
let sort: TSort = null

const values = (rec: TRec) => COLUMNS.map((c) => String(rec[c.field]))

function make(rec: TRec): HTMLElement {
	const row = document.createElement('ui5-table-row')

	row.setAttribute('row-key', String(rec.id))
	for (const value of values(rec))
		row.appendChild(document.createElement('ui5-table-cell')).textContent = value

	return row
}

function update(row: HTMLElement, rec: TRec) {
	writeCells(row.querySelectorAll('ui5-table-cell'), values(rec))
}

function build(host: Element) {
	const element = document.createElement('ui5-table')
	const header = document.createElement('ui5-table-header-row')
	const selection = document.createElement('ui5-table-selection-multi')
	const cells: HTMLElement[] = []

	rows = new TKeyedRows(element, make, update)
	rows.write(data)
	header.slot = 'headerRow'
	selection.slot = 'features'
	for (const c of COLUMNS) {
		const cell = header.appendChild(document.createElement('ui5-table-header-cell'))

		cell.dataset.col = c.field
		cell.textContent = c.text
		cell.addEventListener('click', () => {
			sort = nextSort(sort, c.field)
			for (const other of cells)
				Reflect.set(
					other,
					'sortIndicator',
					other !== cell ? 'None' : sort?.dir === 1 ? 'Ascending' : 'Descending',
				)
			rows?.write(sorted(data, sort))
		})
		cells.push(cell)
	}
	element.append(header, selection)
	host.append(element)
	table = element
}

export function render(host: Element, next: TRec[] | null) {
	if (!next) {
		table?.remove()
		table = rows = null
		data = []
		sort = null
		return
	}

	data = next
	if (table) rows?.write(sorted(data, sort))
	else build(host)
}
