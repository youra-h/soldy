import { Table, Virtual } from '@soldy-ui/react'
import type { TRec } from '../data'
import { columns, tableProps, virtual, width } from '../soldy-setup'

export { sel } from '../soldy-setup'

/** Таблица soldy на адаптере React — те же колонки, флаги и обёртки, что у Vue. */
export function Bench({ rows }: { rows: TRec[] }) {
	const table = <Table items={rows.map((data) => ({ data }))} columns={columns} {...tableProps} />
	const body = virtual ? (
		<div className="bench-scroll" style={{ height: 800, overflow: 'auto' }}>
			<Virtual>{table}</Virtual>
		</div>
	) : (
		table
	)

	return width ? <div style={{ width }}>{body}</div> : body
}
