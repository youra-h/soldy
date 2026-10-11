import { createApp, h, type ShallowRef } from 'vue'
import { Table, Virtual } from '@soldy-ui/vue'
import type { TRec } from './data'
import { columns, tableProps, virtual, width } from './soldy-setup'

export { sel } from './soldy-setup'
export function mount(el: Element, rows: ShallowRef<TRec[] | null>) {
	createApp({
		render: () => {
			const table =
				rows.value &&
				h(Table, {
					items: rows.value.map((data) => ({ data })),
					columns,
					...tableProps,
				})

			const body = virtual
				? h('div', { class: 'bench-scroll', style: 'height: 800px; overflow: auto' }, [
						h(Virtual, () => table),
					])
				: table

			return width ? h('div', { style: `width: ${width}px` }, [body]) : body
		},
	}).mount(el)
}
