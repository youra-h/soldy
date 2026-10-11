import { useState } from 'react'
import Checkbox from '@mui/material/Checkbox'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableSortLabel from '@mui/material/TableSortLabel'
import { COLUMNS, type TRec } from '../data'
import { nextSort, sorted, type TSort } from './sort'

export const sel = {
	selectAll: 'thead input[type="checkbox"]',
	sort: 'thead th[data-col="name"] .MuiTableSortLabel-root',
}

/**
 * MUI `Table` по примеру «Sorting & selecting» из документации: выбор и
 * сортировку держит приложение, MUI даёт ячейки, `Checkbox` и
 * `TableSortLabel`. `DataGrid` не берём: бесплатный показывает не больше 100
 * строк на страницу, а без страниц он только в платной версии.
 */
export function Bench({ rows }: { rows: TRec[] }) {
	const [sort, setSort] = useState<TSort>(null)
	const [selected, setSelected] = useState(() => new Set<string | number>())
	const all = rows.length > 0 && selected.size === rows.length

	const toggle = (id: string | number) =>
		setSelected((prev) => {
			const next = new Set(prev)
			if (!next.delete(id)) next.add(id)
			return next
		})

	return (
		<Table size="small">
			<TableHead>
				<TableRow>
					<TableCell padding="checkbox">
						<Checkbox
							checked={all}
							indeterminate={selected.size > 0 && !all}
							onChange={() =>
								setSelected(all ? new Set() : new Set(rows.map((r) => r.id)))
							}
						/>
					</TableCell>
					{COLUMNS.map((c) => (
						<TableCell
							key={c.field}
							data-col={c.field}
							sortDirection={
								sort?.field === c.field ? (sort.dir === 1 ? 'asc' : 'desc') : false
							}
						>
							<TableSortLabel
								active={sort?.field === c.field}
								direction={
									sort?.field === c.field && sort.dir === -1 ? 'desc' : 'asc'
								}
								onClick={() => setSort(nextSort(sort, c.field))}
							>
								{c.text}
							</TableSortLabel>
						</TableCell>
					))}
				</TableRow>
			</TableHead>
			<TableBody>
				{sorted(rows, sort).map((r) => {
					const checked = selected.has(r.id)

					return (
						<TableRow key={r.id} hover selected={checked}>
							<TableCell padding="checkbox">
								<Checkbox checked={checked} onChange={() => toggle(r.id)} />
							</TableCell>
							{COLUMNS.map((c) => (
								<TableCell key={c.field}>{r[c.field]}</TableCell>
							))}
						</TableRow>
					)
				})}
			</TableBody>
		</Table>
	)
}
