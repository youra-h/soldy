import {
	createSortedRowModel,
	rowSelectionFeature,
	rowSortingFeature,
	sortFns,
	tableFeatures,
	useTable,
	type ColumnDef,
} from '@tanstack/react-table'
import * as Checkbox from '@radix-ui/react-checkbox'
import { COLUMNS, type TRec } from '../data'

export const sel = {
	selectAll: 'thead button[role="checkbox"]',
	sort: 'thead th[data-col="name"]',
}

/**
 * Data Table shadcn/ui — TanStack Table v9 и чекбоксы Radix (`Checkbox` у
 * shadcn — обёртка `@radix-ui/react-checkbox` с классами Tailwind; `Table` —
 * теги с классами). Классы и Tailwind не берём: стенд мерит работу, а не CSS.
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

export function Bench({ rows }: { rows: TRec[] }) {
	const table = useTable({ features, columns, data: rows, getRowId: (r) => String(r.id) })
	const headerChecked = table.getIsAllRowsSelected()
		? true
		: table.getIsSomeRowsSelected()
			? 'indeterminate'
			: false

	return (
		<table>
			<thead>
				{table.getHeaderGroups().map((group) => (
					<tr key={group.id}>
						<th>
							<Checkbox.Root
								checked={headerChecked}
								aria-label="Выбрать все"
								onCheckedChange={(v) => table.toggleAllRowsSelected(v === true)}
							>
								<Checkbox.Indicator>✓</Checkbox.Indicator>
							</Checkbox.Root>
						</th>
						{group.headers.map((header) => (
							<th
								key={header.id}
								data-col={header.column.id}
								onClick={() => header.column.toggleSorting()}
							>
								{String(header.column.columnDef.header)}
							</th>
						))}
					</tr>
				))}
			</thead>
			<tbody>
				{table.getRowModel().rows.map((row) => (
					<tr key={row.id}>
						<td>
							<Checkbox.Root
								checked={row.getIsSelected()}
								aria-label="Выбрать строку"
								onCheckedChange={(v) => row.toggleSelected(v === true)}
							>
								<Checkbox.Indicator>✓</Checkbox.Indicator>
							</Checkbox.Root>
						</td>
						{row.getAllCells().map((cell) => (
							<td key={cell.id}>{String(cell.getValue())}</td>
						))}
					</tr>
				))}
			</tbody>
		</table>
	)
}
