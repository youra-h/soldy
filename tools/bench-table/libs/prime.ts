import { createApp, h, ref, type ShallowRef } from 'vue'
import PrimeVue from 'primevue/config'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Aura from '@primeuix/themes/aura'
import { COLUMNS, type TRec } from './data'

export const sel = {
	selectAll: 'thead input[type="checkbox"]',
	sort: 'thead th.p-datatable-sortable-column',
}
// `?virtual=1` — свой виртуальный скроллер строк в окне высотой 800 px
const virtual = new URLSearchParams(location.search).get('virtual') === '1'
export function mount(el: Element, rows: ShallowRef<TRec[] | null>) {
	const selection = ref<TRec[]>([])
	createApp({
		render: () =>
			rows.value &&
			h(
				DataTable,
				{
					value: rows.value,
					dataKey: 'id',
					selection: selection.value,
					'onUpdate:selection': (v: TRec[]) => (selection.value = v),
					...(virtual
						? {
								scrollable: true,
								scrollHeight: '800px',
								virtualScrollerOptions: { itemSize: 46 },
							}
						: {}),
				},
				() => [
					h(Column, { selectionMode: 'multiple', headerStyle: 'width:3rem' }),
					...COLUMNS.map((c) =>
						h(Column, { key: c.field, field: c.field, header: c.text, sortable: true }),
					),
				],
			),
	})
		.use(PrimeVue, { theme: { preset: Aura } })
		.mount(el)
}
