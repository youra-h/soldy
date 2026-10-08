import { createApp, h, type ShallowRef } from 'vue'
import { NDataTable } from 'naive-ui'
import { COLUMNS, type TRec } from './data'

const columns = [
	{ type: 'selection' as const },
	...COLUMNS.map((c) => ({ key: c.field, title: c.text, sorter: 'default' as const })),
]
export const sel = { selectAll: 'thead .n-checkbox', sort: 'thead th[data-col-key="name"]' }
export function mount(el: Element, rows: ShallowRef<TRec[] | null>) {
	createApp({
		render: () =>
			rows.value && h(NDataTable, { columns, data: rows.value, rowKey: (r: TRec) => r.id }),
	}).mount(el)
}
