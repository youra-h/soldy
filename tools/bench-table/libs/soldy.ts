import { createApp, h, type ShallowRef } from 'vue'
import { setIcons, useTheme } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import { Table } from '@soldy-ui/vue'
import '@soldy-ui/theme-oren'
import oren from '@soldy-ui/theme-oren/setup'
import { COLUMNS, type TRec } from './data'

setIcons(material)
useTheme(oren)
const columns = COLUMNS.map((c) => ({ ...c, sortable: true }))
export const sel = {
	selectAll: 'thead .s-table__select input',
	sort: 'thead .s-table-column__sort',
}
const query = new URLSearchParams(location.search)
// `?mode=none` — таблица без выбора: строка без чекбокса, для сравнения памяти
const mode = query.get('mode') === 'none' ? 'none' : 'multiple'
// `?virtual=1` — режим окна: таблица в контейнере высотой 800 px, тело
// рисует только видимые строки
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
					virtual,
					aria_label: 'Бенч',
				})

			return virtual
				? h('div', { class: 'bench-scroll', style: 'height: 800px; overflow: auto' }, [
						table,
					])
				: table
		},
	}).mount(el)
}
