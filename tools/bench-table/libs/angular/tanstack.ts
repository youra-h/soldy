import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import {
	createSortedRowModel,
	injectTable,
	rowSelectionFeature,
	rowSortingFeature,
	sortFns,
	tableFeatures,
	type ColumnDef,
} from '@tanstack/angular-table'
import { COLUMNS, type TRec } from '../data'

export const sel = { selectAll: 'thead input[type="checkbox"]', sort: 'thead th[data-col="name"]' }

/**
 * TanStack Table v9 — headless: логика выбора и сортировки у неё, разметка
 * своя, чекбоксы нативные.
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

@Component({
	selector: 'bench-tanstack',
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<table>
			<thead>
				@for (group of table.getHeaderGroups(); track group.id) {
					<tr>
						<th>
							<input
								type="checkbox"
								[checked]="table.getIsAllRowsSelected()"
								(change)="
									table.toggleAllRowsSelected(!table.getIsAllRowsSelected())
								"
							/>
						</th>
						@for (header of group.headers; track header.id) {
							<th
								[attr.data-col]="header.column.id"
								(click)="header.column.toggleSorting()"
							>
								{{ header.column.columnDef.header }}
							</th>
						}
					</tr>
				}
			</thead>
			<tbody>
				@for (row of table.getRowModel().rows; track row.id) {
					<tr>
						<td>
							<input
								type="checkbox"
								[checked]="row.getIsSelected()"
								(change)="row.toggleSelected()"
							/>
						</td>
						@for (cell of row.getAllCells(); track cell.id) {
							<td>{{ cell.getValue() }}</td>
						}
					</tr>
				}
			</tbody>
		</table>
	`,
})
export class Bench {
	readonly rows = input.required<TRec[]>()
	protected readonly table = injectTable(() => ({
		features,
		columns,
		data: this.rows(),
		getRowId: (r: TRec) => String(r.id),
	}))
}
