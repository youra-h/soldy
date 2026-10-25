import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core'
import Aura from '@primeuix/themes/aura'
import { providePrimeNG } from 'primeng/config'
import { TableModule } from 'primeng/table'
import { COLUMNS, type TRec } from '../data'

export const sel = {
	selectAll: 'thead input[type="checkbox"]',
	sort: 'thead th.p-datatable-sortable-column',
}
export const providers = [providePrimeNG({ theme: { preset: Aura } })]

/**
 * PrimeNG `p-table` — как PrimeVue на странице Vue: выбор строк с чекбоксом
 * «выбрать все» в шапке (`p-table-header-checkbox`, `p-table-checkbox`) и
 * сортировка заголовком (`pSortableColumn`) встроены, строки сверяются по
 * `dataKey`. С флагом `virtual` — свой виртуальный скроллер строк в окне высотой
 * 800 px.
 */
const virtual = new URLSearchParams(location.search).get('virtual') === '1'

@Component({
	selector: 'bench-prime',
	imports: [TableModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<p-table
			[value]="rows()"
			dataKey="id"
			[(selection)]="selection"
			[scrollable]="virtual"
			[scrollHeight]="virtual ? '800px' : undefined"
			[virtualScroll]="virtual"
			[virtualScrollItemSize]="46"
		>
			<ng-template #header>
				<tr>
					<th style="width: 3rem"><p-table-header-checkbox /></th>
					@for (c of columns; track c.field) {
						<th [pSortableColumn]="c.field">
							{{ c.text }} <p-sort-icon [field]="c.field" />
						</th>
					}
				</tr>
			</ng-template>
			<ng-template #body let-row>
				<tr>
					<td><p-table-checkbox [value]="row" /></td>
					@for (c of columns; track c.field) {
						<td>{{ row[c.field] }}</td>
					}
				</tr>
			</ng-template>
		</p-table>
	`,
})
export class Bench {
	readonly rows = input.required<TRec[]>()
	protected readonly columns = COLUMNS
	protected readonly selection = signal<TRec[]>([])
	protected readonly virtual = virtual
}
