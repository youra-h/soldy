// Стили пакет отдаёт только под условием `style`, а импорт из скрипта его не
// берёт — файлом
import '../../node_modules/ng-zorro-antd/ng-zorro-antd.min.css'
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core'
import { NzTableModule, type NzTableSortFn } from 'ng-zorro-antd/table'
import { COLUMNS, type TRec } from '../data'
import { compareBy } from '../sort'

export const sel = {
	selectAll: 'thead .ant-checkbox-input',
	sort: 'thead th.ant-table-column-has-sorters',
}

/**
 * NG-ZORRO `nz-table` по примерам «Checkbox» и «Sort»: чекбоксы строк и «выбрать
 * все» — входы `nzChecked` ячеек, выбор — `Set` в сигнале, сортировка — своя у
 * таблицы по `nzSortFn` заголовка. Страниц нет (`nzFrontPagination`,
 * `nzShowPagination`): по умолчанию таблица делит строки по 10. С флагом
 * `virtual` — её окно высотой 800 px (`nzVirtualItemSize`).
 */
const virtual = new URLSearchParams(location.search).get('virtual') === '1'

@Component({
	selector: 'bench-zorro',
	imports: [NzTableModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<nz-table
			#table
			[nzData]="rows()"
			[nzFrontPagination]="false"
			[nzShowPagination]="false"
			[nzVirtualItemSize]="virtual ? 54 : 0"
			[nzScroll]="virtual ? { y: '800px' } : {}"
		>
			<thead>
				<tr>
					<th
						[nzChecked]="all()"
						[nzIndeterminate]="some()"
						(nzCheckedChange)="toggleAll($event)"
					></th>
					@for (c of columns; track c.field) {
						<th [nzSortFn]="c.compare">{{ c.text }}</th>
					}
				</tr>
			</thead>
			<tbody>
				@if (virtual) {
					<ng-template nz-virtual-scroll let-row>
						<tr>
							<td
								[nzChecked]="selected().has(row.id)"
								(nzCheckedChange)="toggle(row.id)"
							></td>
							@for (c of columns; track c.field) {
								<td>{{ row[c.field] }}</td>
							}
						</tr>
					</ng-template>
				} @else {
					@for (row of table.data; track row.id) {
						<tr>
							<td
								[nzChecked]="selected().has(row.id)"
								(nzCheckedChange)="toggle(row.id)"
							></td>
							@for (c of columns; track c.field) {
								<td>{{ row[c.field] }}</td>
							}
						</tr>
					}
				}
			</tbody>
		</nz-table>
	`,
})
export class Bench {
	readonly rows = input.required<TRec[]>()
	protected readonly virtual = virtual
	protected readonly columns = COLUMNS.map((c) => {
		const compare: NzTableSortFn<TRec> = compareBy(c.field)

		return { ...c, compare }
	})
	protected readonly selected = signal(new Set<string | number>())
	protected readonly all = computed(
		() => this.rows().length > 0 && this.selected().size === this.rows().length,
	)
	protected readonly some = computed(() => this.selected().size > 0 && !this.all())

	protected toggleAll(checked: boolean) {
		this.selected.set(checked ? new Set(this.rows().map((r) => r.id)) : new Set())
	}

	protected toggle(id: string | number) {
		const next = new Set(this.selected())

		if (!next.delete(id)) next.add(id)
		this.selected.set(next)
	}
}
