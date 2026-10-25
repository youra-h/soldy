import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { AgGridAngular } from 'ag-grid-angular'
import {
	AllCommunityModule,
	ModuleRegistry,
	type ColDef,
	type GetRowIdParams,
	type RowSelectionOptions,
} from 'ag-grid-community'
import { COLUMNS, type TRec } from '../data'

export { sel } from '../aggrid'

ModuleRegistry.registerModules([AllCommunityModule])

/**
 * AG Grid Community: сортировка заголовком и колонка выбора с чекбоксом
 * «выбрать все» (`rowSelection` с `headerCheckbox`) встроены, строки сверяются
 * по `getRowId`, тема — встроенная (Quartz). Окно строк и колонок у него по
 * умолчанию, и строк он рисует не больше 500; без флага `virtual` всё это
 * выключено (`suppressRowVirtualisation`, `suppressColumnVirtualisation`,
 * `suppressMaxRenderedRowRestriction`), а высота — по строкам (`domLayout:
 * 'autoHeight'`). С флагом — грид высотой 800 px, как окно soldy.
 */
const virtual = new URLSearchParams(location.search).get('virtual') === '1'

@Component({
	selector: 'bench-aggrid',
	imports: [AgGridAngular],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		@if (virtual) {
			<ag-grid-angular
				class="bench-scroll"
				style="display: block; height: 800px"
				[rowData]="rows()"
				[columnDefs]="columns"
				[rowSelection]="selection"
				[getRowId]="getRowId"
			/>
		} @else {
			<ag-grid-angular
				domLayout="autoHeight"
				[rowData]="rows()"
				[columnDefs]="columns"
				[rowSelection]="selection"
				[getRowId]="getRowId"
				[suppressRowVirtualisation]="true"
				[suppressColumnVirtualisation]="true"
				[suppressMaxRenderedRowRestriction]="true"
			/>
		}
	`,
})
export class Bench {
	readonly rows = input.required<TRec[]>()
	protected readonly virtual = virtual
	protected readonly columns: ColDef<TRec>[] = COLUMNS.map((c) => ({
		field: c.field,
		headerName: c.text,
	}))
	protected readonly selection: RowSelectionOptions = { mode: 'multiRow', headerCheckbox: true }
	protected readonly getRowId = (params: GetRowIdParams<TRec>) => String(params.data.id)
}
