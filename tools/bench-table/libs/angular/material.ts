// Тему пакет отдаёт только под условием `style`, а импорт из скрипта его не
// берёт — файлом
import '../../node_modules/@angular/material/prebuilt-themes/azure-blue.css'
import { SelectionModel } from '@angular/cdk/collections'
import { Component, effect, input, viewChild } from '@angular/core'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatSort, MatSortModule } from '@angular/material/sort'
import { MatTableDataSource, MatTableModule } from '@angular/material/table'
import { COLUMNS, type TRec } from '../data'

export const sel = {
	selectAll: 'thead mat-checkbox input[type="checkbox"]',
	sort: 'thead th.mat-column-name',
}

/**
 * Angular Material `mat-table` по примерам «Table with selection» и «Table with
 * sorting»: колонка выбора — `mat-checkbox` над `SelectionModel` CDK, «выбрать
 * все» — в шапке, сортировка — `matSort` и `mat-sort-header` у
 * `MatTableDataSource`. Строки сверяются по `id` (`trackBy`). Обнаружение
 * изменений — по умолчанию, как в примерах: состояние выбора у `SelectionModel`
 * не сигнал.
 */
@Component({
	selector: 'bench-material',
	imports: [MatTableModule, MatSortModule, MatCheckboxModule],
	template: `
		<table mat-table [dataSource]="source" [trackBy]="trackById" matSort>
			<ng-container matColumnDef="select">
				<th mat-header-cell *matHeaderCellDef>
					<mat-checkbox
						(change)="$event ? toggleAllRows() : null"
						[checked]="selection.hasValue() && isAllSelected()"
						[indeterminate]="selection.hasValue() && !isAllSelected()"
						aria-label="Выбрать все"
					/>
				</th>
				<td mat-cell *matCellDef="let row">
					<mat-checkbox
						(click)="$event.stopPropagation()"
						(change)="$event ? selection.toggle(row) : null"
						[checked]="selection.isSelected(row)"
						aria-label="Выбрать строку"
					/>
				</td>
			</ng-container>
			@for (c of columns; track c.field) {
				<ng-container [matColumnDef]="c.field">
					<th mat-header-cell *matHeaderCellDef mat-sort-header>{{ c.text }}</th>
					<td mat-cell *matCellDef="let row">{{ row[c.field] }}</td>
				</ng-container>
			}
			<tr mat-header-row *matHeaderRowDef="displayed"></tr>
			<tr mat-row *matRowDef="let row; columns: displayed"></tr>
		</table>
	`,
})
export class Bench {
	readonly rows = input.required<TRec[]>()
	protected readonly columns = COLUMNS
	protected readonly displayed = ['select', ...COLUMNS.map((c) => c.field)]
	protected readonly source = new MatTableDataSource<TRec>([])
	protected readonly selection = new SelectionModel<TRec>(true, [])
	private readonly sort = viewChild.required(MatSort)

	constructor() {
		effect(() => (this.source.data = this.rows()))
		effect(() => (this.source.sort = this.sort()))
	}

	protected trackById = (_: number, row: TRec) => row.id

	protected isAllSelected() {
		return this.selection.selected.length === this.source.data.length
	}

	protected toggleAllRows() {
		if (this.isAllSelected()) this.selection.clear()
		else this.selection.select(...this.source.data)
	}
}
