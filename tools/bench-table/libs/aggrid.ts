import type { TShown } from '../bench'

/**
 * Селекторы AG Grid — общие для его адаптеров (Angular — версия 36, Solid — 31):
 * разметка грида у них одна. Строки — `div.ag-row`, а не `tr`, и стоят они не
 * по порядку показа, а по `row-index`: первая ячейка — у строки с индексом 0.
 */
export const sel = {
	selectAll: '.ag-header-select-all input[type="checkbox"]',
	sort: '.ag-header-cell[col-id="name"] .ag-header-cell-label',
	shown: (): TShown => ({
		rows: document.querySelectorAll('.ag-row[row-index]').length,
		checked: document.querySelectorAll('.ag-selection-checkbox input[type="checkbox"]:checked')
			.length,
		first: document
			.querySelector('.ag-row[row-index="0"] [col-id="name"]')
			?.textContent?.trim(),
	}),
}
