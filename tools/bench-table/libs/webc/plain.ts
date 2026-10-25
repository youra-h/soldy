import { COLUMNS, type TRec } from '../data'
import { sorted, nextSort, type TSort } from '../sort'
import { TKeyedRows, writeCells } from './keyed'

export const sel = { selectAll: 'thead input[type="checkbox"]', sort: 'thead th[data-col="name"]' }

/**
 * Нижняя граница: таблица на голом DOM — `createElement`, нативные чекбоксы,
 * выбор в `Set`, сортировка по клику на заголовок перестановкой узлов строк.
 * Строки сверяются по `id` (`TKeyedRows`), как ключ строки у Vue и React. Как
 * голая таблица Vue: ни доступности сверх тегов, ни клавиатуры.
 */
let table: HTMLTableElement | null = null
let rows: TKeyedRows<HTMLTableRowElement> | null = null
let all: HTMLInputElement | null = null
let data: TRec[] = []
let sort: TSort = null
const selected = new Set<TRec['id']>()

const values = (rec: TRec) => COLUMNS.map((c) => String(rec[c.field]))

function make(rec: TRec): HTMLTableRowElement {
	const tr = document.createElement('tr')
	const check = tr.insertCell().appendChild(document.createElement('input'))

	check.type = 'checkbox'
	check.checked = selected.has(rec.id)
	check.addEventListener('change', () => {
		if (check.checked) selected.add(rec.id)
		else selected.delete(rec.id)
		syncAll()
	})
	for (const value of values(rec)) tr.insertCell().textContent = value

	return tr
}

function update(tr: HTMLTableRowElement, rec: TRec) {
	writeCells([...tr.cells].slice(1), values(rec))
}

function syncAll() {
	if (all) all.checked = data.length > 0 && selected.size === data.length
}

function toggleAll() {
	const check = selected.size !== data.length

	selected.clear()
	if (check) for (const rec of data) selected.add(rec.id)
	for (const rec of data) {
		const box = rows?.node(rec.id)?.cells[0].firstElementChild

		if (box instanceof HTMLInputElement) box.checked = check
	}
	syncAll()
}

function build(host: Element) {
	table = document.createElement('table')

	const head = table.createTHead().insertRow()

	all = head
		.appendChild(document.createElement('th'))
		.appendChild(document.createElement('input'))
	all.type = 'checkbox'
	all.addEventListener('change', toggleAll)
	for (const c of COLUMNS) {
		const th = head.appendChild(document.createElement('th'))

		th.dataset.col = c.field
		th.textContent = c.text
		th.addEventListener('click', () => {
			sort = nextSort(sort, c.field)
			rows?.write(sorted(data, sort))
		})
	}
	rows = new TKeyedRows(table.createTBody(), make, update)
	host.append(table)
}

export function render(host: Element, next: TRec[] | null) {
	if (!next) {
		table?.remove()
		table = rows = all = null
		data = []
		sort = null
		selected.clear()
		return
	}

	if (!table) build(host)
	data = next
	rows?.write(sorted(data, sort))
	syncAll()
}
