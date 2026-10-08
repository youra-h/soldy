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
export function mount(el: Element, rows: ShallowRef<TRec[] | null>) {
	createApp({
		render: () =>
			rows.value &&
			h(Table, {
				items: rows.value.map((data) => ({ data })),
				columns,
				mode: 'multiple',
				aria_label: 'Бенч',
			}),
	}).mount(el)
}
