import '@spectrum-web-components/theme/sp-theme.js'
import '@spectrum-web-components/theme/theme-light.js'
import '@spectrum-web-components/theme/scale-medium.js'
import '@spectrum-web-components/table/elements.js'
import type { TShown } from '../../bench'
import { COLUMNS, type TRec } from '../data'
import { sorted, type TSort } from '../sort'
import { TKeyedRows, writeCells } from './keyed'
import { inShadow } from './shadow'

export const sel = {
	selectAll: () => inShadow('sp-table-head sp-table-checkbox-cell', 'sp-checkbox'),
	sort: 'sp-table-head-cell[sort-key="name"]',
	shown: (): TShown => ({
		rows: document.querySelectorAll('sp-table-body sp-table-row').length,
		checked: document.querySelectorAll('sp-table-body sp-table-row[selected]').length,
		first: document
			.querySelector('sp-table-body sp-table-row sp-table-cell')
			?.textContent?.trim(),
	}),
}

/**
 * Spectrum `sp-table` (`@spectrum-web-components/table`) в теме `sp-theme`:
 * строки — разметкой приложения в свете таблицы, выбор с чекбоксом «выбрать
 * все» в шапке встроен (`selects="multiple"`, строки — по `value`). Сортировку
 * заголовок только сообщает (`sorted`), строки переставляет приложение — так в
 * документации. Чекбоксы строк таблица ставит при первом обновлении, поэтому
 * она собирается со всеми строками до вставки в документ. Строки сверяются по
 * `id` (`TKeyedRows`).
 */
let theme: HTMLElement | null = null
let rows: TKeyedRows<HTMLElement> | null = null
let data: TRec[] = []
let sort: TSort = null

const values = (rec: TRec) => COLUMNS.map((c) => String(rec[c.field]))

function make(rec: TRec): HTMLElement {
	const row = document.createElement('sp-table-row')

	Reflect.set(row, 'value', String(rec.id))
	for (const value of values(rec))
		row.appendChild(document.createElement('sp-table-cell')).textContent = value

	return row
}

function update(row: HTMLElement, rec: TRec) {
	writeCells(row.querySelectorAll('sp-table-cell'), values(rec))
}

export function render(host: Element, next: TRec[] | null) {
	if (!next) {
		theme?.remove()
		theme = rows = null
		data = []
		sort = null
		return
	}

	data = next
	if (theme) {
		rows?.write(sorted(data, sort))
		return
	}

	theme = document.createElement('sp-theme')
	theme.setAttribute('system', 'spectrum')
	theme.setAttribute('color', 'light')
	theme.setAttribute('scale', 'medium')

	const table = theme.appendChild(document.createElement('sp-table'))
	const head = table.appendChild(document.createElement('sp-table-head'))

	table.setAttribute('selects', 'multiple')
	for (const c of COLUMNS) {
		const cell = head.appendChild(document.createElement('sp-table-head-cell'))

		cell.setAttribute('sortable', '')
		cell.setAttribute('sort-key', c.field)
		cell.textContent = c.text
	}
	table.addEventListener('sorted', (event) => {
		const detail: unknown = Reflect.get(event, 'detail')
		const field = Reflect.get(Object(detail), 'sortKey')
		const direction = Reflect.get(Object(detail), 'sortDirection')

		sort = { field: String(field), dir: direction === 'desc' ? -1 : 1 }
		rows?.order(sorted(data, sort).flatMap((rec) => rows?.node(rec.id) ?? []))
	})
	rows = new TKeyedRows(table.appendChild(document.createElement('sp-table-body')), make, update)
	rows.write(data)
	host.append(theme)
}
