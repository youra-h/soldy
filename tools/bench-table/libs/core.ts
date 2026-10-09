import { createApp, h, type ShallowRef } from 'vue'
import CoreTable from './CoreTable.vue'
import type { TRec } from './data'

export const sel = { selectAll: 'thead input[type="checkbox"]', sort: 'thead th[data-col="name"]' }
export function mount(el: Element, rows: ShallowRef<TRec[] | null>) {
	createApp({ render: () => rows.value && h(CoreTable, { data: rows.value }) }).mount(el)
}
