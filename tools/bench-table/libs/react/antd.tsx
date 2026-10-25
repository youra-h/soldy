import { Table } from 'antd'
import { COLUMNS, type TRec } from '../data'
import { compareBy } from '../sort'

export const sel = {
	selectAll: 'thead .ant-table-selection input',
	sort: 'thead th.ant-table-column-has-sorters',
}
const columns = COLUMNS.map((c) => ({
	key: c.field,
	dataIndex: c.field,
	title: c.text,
	sorter: compareBy(c.field),
}))
// `?virtual=1` — своя виртуализация строк (`virtual`) в окне высотой 800 px
const virtual = new URLSearchParams(location.search).get('virtual') === '1'

/** Ant Design `Table`: выбор (`rowSelection`) и сортировка — свои, страниц нет. */
export function Bench({ rows }: { rows: TRec[] }) {
	return (
		<Table<TRec>
			columns={columns}
			dataSource={rows}
			rowKey="id"
			rowSelection={{}}
			pagination={false}
			size="small"
			{...(virtual ? { virtual: true, scroll: { x: 3200, y: 800 } } : {})}
		/>
	)
}
