import { createApp, h, type ShallowRef } from 'vue'
import TanstackTable from './TanstackTable.vue'
import type { TRec } from './data'

export const sel = { selectAll: 'thead input[type="checkbox"]', sort: 'thead th[data-col="name"]' }
export function mount(el: Element, rows: ShallowRef<TRec[] | null>) {
	createApp({
		render: () => rows.value && h(TanstackTable, { data: rows.value, reka: false }),
	}).mount(el)
}
