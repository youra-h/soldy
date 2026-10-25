import '@vaadin/grid/vaadin-grid.js'
import '@vaadin/grid/vaadin-grid-selection-column.js'
import '@vaadin/grid/vaadin-grid-sort-column.js'
import type { TShown } from '../../bench'
import { COLUMNS, type TRec } from '../data'

/**
 * Строки Vaadin Grid — `tr` в его тени, а текст ячейки — в свете, узлом
 * `vaadin-grid-cell-content` в слоте ячейки. Строки стоят не по порядку показа:
 * первая ячейка — у строки с индексом 0.
 */
const grid = () => document.querySelector('vaadin-grid')
const rows = () => [...(grid()?.shadowRoot?.querySelectorAll('#items tr') ?? [])]

function cellText(row: Element | undefined, column: number): string | undefined {
	const slot = row?.children[column]?.querySelector('slot')

	return slot?.assignedElements()[0]?.textContent?.trim()
}

export const sel = {
	selectAll: 'vaadin-grid vaadin-checkbox.vaadin-grid-select-all-checkbox',
	// Первый сортировщик — колонки имени: атрибута `path` у сортировщика нет
	sort: 'vaadin-grid vaadin-grid-sorter',
	shown: (): TShown => ({
		rows: rows().length,
		checked: document.querySelectorAll(
			'vaadin-grid vaadin-checkbox[checked]:not(.vaadin-grid-select-all-checkbox)',
		).length,
		first: cellText(
			rows().find((row) => Reflect.get(row, 'index') === 0),
			1,
		),
	}),
}

/**
 * Vaadin Grid — колонка выбора с чекбоксом «выбрать все» в шапке
 * (`vaadin-grid-selection-column`) и колонки сортировки заголовком
 * (`vaadin-grid-sort-column`) встроены, строки сверяются по `id`
 * (`itemIdPath`), стили — базовые, встроенные в элементы. Окно строк у него по
 * умолчанию; без флага `virtual` оно выключено (`allRowsVisible`), с флагом —
 * грид высотой 800 px, как окно soldy.
 */
const virtual = new URLSearchParams(location.search).get('virtual') === '1'
let element: HTMLElement | null = null

export function render(host: Element, next: TRec[] | null) {
	if (!next) {
		element?.remove()
		element = null
		return
	}

	if (element) {
		Reflect.set(element, 'items', next)
		return
	}

	element = document.createElement('vaadin-grid')
	Reflect.set(element, 'itemIdPath', 'id')
	if (virtual) element.style.height = '800px'
	else Reflect.set(element, 'allRowsVisible', true)

	const select = document.createElement('vaadin-grid-selection-column')

	Reflect.set(select, 'autoSelect', true)
	element.append(select)
	for (const c of COLUMNS) {
		const column = document.createElement('vaadin-grid-sort-column')

		Reflect.set(column, 'path', c.field)
		Reflect.set(column, 'header', c.text)
		element.append(column)
	}
	Reflect.set(element, 'items', next)
	host.append(element)
}
