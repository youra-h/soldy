<script lang="ts">
	import {
		createSortedRowModel,
		createTable,
		rowSelectionFeature,
		rowSortingFeature,
		sortFns,
		tableFeatures,
		type ColumnDef,
	} from '@tanstack/svelte-table'
	import { Checkbox } from 'bits-ui'
	import { COLUMNS, type TRec } from '../data'

	/**
	 * TanStack Table v9 — headless: логика выбора и сортировки у неё, разметка
	 * своя. `bits` — чекбоксы компонентом `Checkbox` Bits UI (так устроена Data
	 * Table shadcn-svelte), без него — нативные `<input type="checkbox">`.
	 */
	const { rows, bits }: { rows: TRec[]; bits: boolean } = $props()
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
	const table = createTable({
		features,
		columns,
		get data() {
			return rows
		},
		getRowId: (r) => String(r.id),
	})
</script>

<table>
	<thead>
		{#each table.getHeaderGroups() as group (group.id)}
			<tr>
				<th>
					{#if bits}
						<Checkbox.Root
							checked={table.getIsAllRowsSelected()}
							indeterminate={table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()}
							aria-label="Выбрать все"
							onCheckedChange={(v) => table.toggleAllRowsSelected(v)}
						>
							{#snippet children({ checked })}{checked ? '✓' : ''}{/snippet}
						</Checkbox.Root>
					{:else}
						<input
							type="checkbox"
							checked={table.getIsAllRowsSelected()}
							onchange={() => table.toggleAllRowsSelected(!table.getIsAllRowsSelected())}
						/>
					{/if}
				</th>
				{#each group.headers as header (header.id)}
					<th data-col={header.column.id} onclick={() => header.column.toggleSorting()}>
						{String(header.column.columnDef.header)}
					</th>
				{/each}
			</tr>
		{/each}
	</thead>
	<tbody>
		{#each table.getRowModel().rows as row (row.id)}
			<tr>
				<td>
					{#if bits}
						<Checkbox.Root
							checked={row.getIsSelected()}
							aria-label="Выбрать строку"
							onCheckedChange={(v) => row.toggleSelected(v)}
						>
							{#snippet children({ checked })}{checked ? '✓' : ''}{/snippet}
						</Checkbox.Root>
					{:else}
						<input
							type="checkbox"
							checked={row.getIsSelected()}
							onchange={() => row.toggleSelected()}
						/>
					{/if}
				</td>
				{#each row.getAllCells() as cell (cell.id)}
					<td>{cell.getValue()}</td>
				{/each}
			</tr>
		{/each}
	</tbody>
</table>
