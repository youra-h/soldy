// Стили — той копии AG Grid, что у адаптера: `ag-grid-solid` держит свою,
// 31.1.1, а в корне стенда — 36 для Angular
import '../../node_modules/ag-grid-solid/node_modules/ag-grid-community/styles/ag-grid.css'
import '../../node_modules/ag-grid-solid/node_modules/ag-grid-community/styles/ag-theme-quartz.css'
import AgGridSolid from 'ag-grid-solid'
import { COLUMNS, type TRec } from '../data'

export { sel } from '../aggrid'

/**
 * AG Grid в Solid — официальный адаптер `ag-grid-solid` на ядре 31.1.1: адаптер
 * заброшен с 2024 года, и новее ядра у Solid нет. Строки и ячейки рисует сам
 * Solid. Сортировка заголовком встроена, колонка выбора с чекбоксом «выбрать
 * все» — первая колонка с `checkboxSelection` и `headerCheckboxSelection`, как в
 * документации ядра 31; строки сверяются по `getRowId`, тема — Quartz. Окно
 * строк и колонок, предел в 500 строк и высота — как у AG Grid на Angular.
 */
const virtual = new URLSearchParams(location.search).get('virtual') === '1'
const columns = [
	{
		colId: 'select',
		headerName: '',
		width: 50,
		sortable: false,
		checkboxSelection: true,
		headerCheckboxSelection: true,
	},
	...COLUMNS.map((c) => ({ field: c.field, headerName: c.text })),
]
const getRowId = (params: { data: TRec }) => String(params.data.id)

export function Bench(props: { rows: TRec[] }) {
	return virtual ? (
		<div class="ag-theme-quartz bench-scroll" style={{ height: '800px' }}>
			<AgGridSolid
				rowData={props.rows}
				columnDefs={columns}
				rowSelection="multiple"
				getRowId={getRowId}
			/>
		</div>
	) : (
		<div class="ag-theme-quartz">
			<AgGridSolid
				rowData={props.rows}
				columnDefs={columns}
				rowSelection="multiple"
				getRowId={getRowId}
				domLayout="autoHeight"
				suppressRowVirtualisation
				suppressColumnVirtualisation
				suppressMaxRenderedRowRestriction
			/>
		</div>
	)
}
