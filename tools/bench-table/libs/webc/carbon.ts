import '@carbon/web-components/es/components/data-table/index.js'
import type { TShown } from '../../bench'
import { COLUMNS, type TRec } from '../data'
import { TKeyedRows, writeCells } from './keyed'
import { inShadow } from './shadow'

export const sel = {
	selectAll: () => inShadow('cds-table-header-row', 'cds-checkbox', 'input'),
	sort: () => inShadow('cds-table-header-cell', 'button'),
	shown: (): TShown => ({
		rows: document.querySelectorAll('cds-table-body cds-table-row').length,
		checked: document.querySelectorAll('cds-table-body cds-table-row[selected]').length,
		first: document
			.querySelector('cds-table-body cds-table-row cds-table-cell')
			?.textContent?.trim(),
	}),
}

/**
 * Carbon `cds-table` (`@carbon/web-components`): строки — разметкой приложения
 * в свете таблицы, как в документации; сортировка заголовком (`is-sortable`) и
 * чекбокс «выбрать все» в шапке встроены — таблица сама переставляет строки по
 * тексту ячеек и выбирает строки с `selection-name`. Строки сверяются по `id`
 * (`TKeyedRows`). Своего окна у таблицы нет.
 */
let table: HTMLElement | null = null
let rows: TKeyedRows<HTMLElement> | null = null

const values = (rec: TRec) => COLUMNS.map((c) => String(rec[c.field]))

function make(rec: TRec): HTMLElement {
	const row = document.createElement('cds-table-row')

	Reflect.set(row, 'selectionName', String(rec.id))
	for (const value of values(rec))
		row.appendChild(document.createElement('cds-table-cell')).textContent = value

	return row
}

function update(row: HTMLElement, rec: TRec) {
	writeCells(row.querySelectorAll('cds-table-cell'), values(rec))
}

export function render(host: Element, next: TRec[] | null) {
	if (!next) {
		table?.remove()
		table = rows = null
		return
	}

	if (table) {
		rows?.write(next)
		return
	}

	table = document.createElement('cds-table')
	table.setAttribute('is-sortable', '')

	const head = table.appendChild(document.createElement('cds-table-head'))
	const header = head.appendChild(document.createElement('cds-table-header-row'))

	for (const c of COLUMNS)
		header.appendChild(document.createElement('cds-table-header-cell')).textContent = c.text
	rows = new TKeyedRows(table.appendChild(document.createElement('cds-table-body')), make, update)
	rows.write(next)
	host.append(table)
}
