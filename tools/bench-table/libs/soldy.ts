import { createApp, h, type ShallowRef } from 'vue'
import { setIcons, useTheme } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import { useMotion } from '@soldy-ui/plugins'
import { Table, Virtual } from '@soldy-ui/vue'
import '@soldy-ui/theme-oren'
import oren from '@soldy-ui/theme-oren/setup'
import { COLUMNS, type TRec } from './data'

setIcons(material)
useTheme(oren)
const query = new URLSearchParams(location.search)
// `?motion=reduce` — без движения (`useMotion('reduce')`): соседи взятого
// заголовка стоят, место — линия. Без флага — режим системы
if (query.get('motion') === 'reduce') useMotion('reduce')
// `?reorder=1` — колонки можно переставлять (`reorderable`): для сценариев
// перестановки. Без флага колонки те же, что всегда
const reorder = query.get('reorder') === '1'
// `?preview=column` — за жестом перестановки идут и ячейки строк
// (`reorderPreview: 'column'`), `?preview=none` — шапка стоит
// (`reorderPreview: 'none'`). Без флага проп не задан
const previewFlag = query.get('preview')
const preview =
	previewFlag === 'column' || previewFlag === 'none' ? { reorderPreview: previewFlag } : {}
const columns = COLUMNS.map((c) => ({
	...c,
	sortable: true,
	...(reorder ? { reorderable: true } : {}),
}))
export const sel = {
	selectAll: 'thead .s-table__select input',
	sort: 'thead .s-table-column__sort',
	// Заголовки колонок данных — их берут сценарии перестановки
	columns: 'thead .s-table-column',
}
// `?mode=none` — таблица без выбора: строка без чекбокса, для сравнения памяти
const mode = query.get('mode') === 'none' ? 'none' : 'multiple'
// `?virtual=1` — окно: таблица в обёртке `Virtual` в контейнере высотой 800 px,
// тело рисует только видимые строки
const virtual = query.get('virtual') === '1'
export function mount(el: Element, rows: ShallowRef<TRec[] | null>) {
	createApp({
		render: () => {
			const table =
				rows.value &&
				h(Table, {
					items: rows.value.map((data) => ({ data })),
					columns,
					mode,
					aria_label: 'Бенч',
					...preview,
				})

			return virtual
				? h('div', { class: 'bench-scroll', style: 'height: 800px; overflow: auto' }, [
						h(Virtual, () => table),
					])
				: table
		},
	}).mount(el)
}
