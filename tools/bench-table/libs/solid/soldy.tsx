import { Table, Virtual } from '@soldy-ui/solid'
import type { TRec } from '../data'
import { columns, tableProps, virtual, width } from '../soldy-setup'

export { sel } from '../soldy-setup'

/** Таблица soldy на адаптере Solid — те же колонки, флаги и обёртки, что у Vue. */
export function Bench(props: { rows: TRec[] }) {
	const table = () => (
		<Table items={props.rows.map((data) => ({ data }))} columns={columns} {...tableProps} />
	)
	const body = () =>
		virtual ? (
			<div class="bench-scroll" style={{ height: '800px', overflow: 'auto' }}>
				<Virtual>{table()}</Virtual>
			</div>
		) : (
			table()
		)

	return width ? <div style={{ width: `${width}px` }}>{body()}</div> : body()
}
