import { createApp, h, type ShallowRef } from 'vue'
import PlainTable from './PlainTable.vue'
import type { TRec } from './data'

export const sel = { selectAll: 'thead input[type="checkbox"]', sort: 'thead th[data-col="name"]' }
export function mount(el: Element, rows: ShallowRef<TRec[] | null>) {
	createApp({ render: () => rows.value && h(PlainTable, { data: rows.value }) }).mount(el)
}
