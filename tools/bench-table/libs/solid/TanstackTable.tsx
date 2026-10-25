import {
	createSortedRowModel,
	createTable,
	rowSelectionFeature,
	rowSortingFeature,
	sortFns,
	tableFeatures,
	type ColumnDef,
} from '@tanstack/solid-table'
import { Checkbox } from '@kobalte/core/checkbox'
import { For, Show } from 'solid-js'
import { COLUMNS, type TRec } from '../data'

/**
 * TanStack Table v9 — headless: логика выбора и сортировки у неё, разметка
 * своя. `kobalte` — чекбоксы компонентом `Checkbox` Kobalte (так устроена Data
 * Table solid-ui: её `Checkbox` — обёртка Kobalte с классами Tailwind), без
 * него — нативные `<input type="checkbox">`. Классы и Tailwind не берём: стенд
 * мерит работу, а не CSS.
 */
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

function Check(props: {
	checked: boolean
	indeterminate?: boolean
	label: string
	onChange: (checked: boolean) => void
}) {
	return (
		<Checkbox
			checked={props.checked}
			indeterminate={props.indeterminate}
			onChange={props.onChange}
			aria-label={props.label}
		>
			<Checkbox.Input />
			<Checkbox.Control>
				<Checkbox.Indicator>✓</Checkbox.Indicator>
			</Checkbox.Control>
		</Checkbox>
	)
}

export function TanstackTable(props: { rows: TRec[]; kobalte: boolean }) {
	const table = createTable({
		features,
		columns,
		get data() {
			return props.rows
		},
		getRowId: (r) => String(r.id),
	})

	return (
		<table>
			<thead>
				<For each={table.getHeaderGroups()}>
					{(group) => (
						<tr>
							<th>
								<Show
									when={props.kobalte}
									fallback={
										<input
											type="checkbox"
											checked={table.getIsAllRowsSelected()}
											onChange={() =>
												table.toggleAllRowsSelected(
													!table.getIsAllRowsSelected(),
												)
											}
										/>
									}
								>
									<Check
										checked={table.getIsAllRowsSelected()}
										indeterminate={
											table.getIsSomeRowsSelected() &&
											!table.getIsAllRowsSelected()
										}
										label="Выбрать все"
										onChange={(v) => table.toggleAllRowsSelected(v)}
									/>
								</Show>
							</th>
							<For each={group.headers}>
								{(header) => (
									<th
										data-col={header.column.id}
										onClick={() => header.column.toggleSorting()}
									>
										{String(header.column.columnDef.header)}
									</th>
								)}
							</For>
						</tr>
					)}
				</For>
			</thead>
			<tbody>
				<For each={table.getRowModel().rows}>
					{(row) => (
						<tr>
							<td>
								<Show
									when={props.kobalte}
									fallback={
										<input
											type="checkbox"
											checked={row.getIsSelected()}
											onChange={() => row.toggleSelected()}
										/>
									}
								>
									<Check
										checked={row.getIsSelected()}
										label="Выбрать строку"
										onChange={(v) => row.toggleSelected(v)}
									/>
								</Show>
							</td>
							<For each={row.getAllCells()}>
								{(cell) => <td>{String(cell.getValue())}</td>}
							</For>
						</tr>
					)}
				</For>
			</tbody>
		</table>
	)
}
