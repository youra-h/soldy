<script setup lang="ts">
import { toRef } from 'vue'
import {
	createSortedRowModel,
	rowSelectionFeature,
	rowSortingFeature,
	sortFns,
	tableFeatures,
	useTable,
	type ColumnDef,
} from '@tanstack/vue-table'
import { CheckboxIndicator, CheckboxRoot } from 'reka-ui'
import { COLUMNS, type TRec } from './data'

/**
 * TanStack Table v9 — headless: логика выбора и сортировки у неё, разметка
 * своя. `reka` — чекбоксы компонентами Reka UI (так устроена Data Table
 * shadcn-vue), без него — нативные `<input type="checkbox">`.
 */
const props = defineProps<{ data: TRec[]; reka: boolean }>()
const features = tableFeatures({
	rowSortingFeature,
	rowSelectionFeature,
	sortedRowModel: createSortedRowModel(),
	sortFns,
})
const columns: ColumnDef<typeof features, TRec>[] = COLUMNS.map((c) => ({
	accessorKey: c.field,
	header: c.text,
}))
const table = useTable({
	features,
	columns,
	data: toRef(props, 'data'),
	getRowId: (r) => String(r.id),
})
const headerChecked = () =>
	table.getIsAllRowsSelected() ? true : table.getIsSomeRowsSelected() ? 'indeterminate' : false
</script>

<template>
	<table>
		<thead>
			<tr v-for="group in table.getHeaderGroups()" :key="group.id">
				<th>
					<CheckboxRoot
						v-if="reka"
						class="bench-checkbox"
						:model-value="headerChecked()"
						aria-label="Выбрать все"
						@update:model-value="
							table.toggleAllRowsSelected(!table.getIsAllRowsSelected())
						"
					>
						<CheckboxIndicator>✓</CheckboxIndicator>
					</CheckboxRoot>
					<input
						v-else
						type="checkbox"
						:checked="table.getIsAllRowsSelected()"
						@change="table.toggleAllRowsSelected(!table.getIsAllRowsSelected())"
					/>
				</th>
				<th
					v-for="header in group.headers"
					:key="header.id"
					:data-col="header.column.id"
					:aria-sort="
						header.column.getIsSorted() === 'asc'
							? 'ascending'
							: header.column.getIsSorted() === 'desc'
								? 'descending'
								: undefined
					"
					@click="header.column.toggleSorting()"
				>
					{{ header.column.columnDef.header }}
				</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="row in table.getRowModel().rows" :key="row.id">
				<td>
					<CheckboxRoot
						v-if="reka"
						class="bench-checkbox"
						:model-value="row.getIsSelected()"
						aria-label="Выбрать строку"
						@update:model-value="(v) => row.toggleSelected(v === true)"
					>
						<CheckboxIndicator>✓</CheckboxIndicator>
					</CheckboxRoot>
					<input
						v-else
						type="checkbox"
						:checked="row.getIsSelected()"
						@change="row.toggleSelected()"
					/>
				</td>
				<td v-for="cell in row.getAllCells()" :key="cell.id">{{ cell.getValue() }}</td>
			</tr>
		</tbody>
	</table>
</template>
