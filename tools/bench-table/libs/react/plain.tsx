import { useState } from 'react'
import { COLUMNS, type TRec } from '../data'
import { nextSort, sorted, type TSort } from './sort'

export const sel = { selectAll: 'thead input[type="checkbox"]', sort: 'thead th[data-col="name"]' }

/**
 * Нижняя граница: таблица на голом React — `map` по строкам, нативные
 * чекбоксы, выбор в `Set` состояния, сортировка по клику на заголовок. Как
 * голая таблица Vue: ни доступности сверх тегов, ни клавиатуры.
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
		<table>
			<thead>
				<tr>
					<th>
						<input
							type="checkbox"
							checked={all}
							onChange={() =>
								setSelected(all ? new Set() : new Set(rows.map((r) => r.id)))
							}
						/>
					</th>
					{COLUMNS.map((c) => (
						<th
							key={c.field}
							data-col={c.field}
							onClick={() => setSort(nextSort(sort, c.field))}
						>
							{c.text}
						</th>
					))}
				</tr>
			</thead>
			<tbody>
				{sorted(rows, sort).map((r) => (
					<tr key={r.id}>
						<td>
							<input
								type="checkbox"
								checked={selected.has(r.id)}
								onChange={() => toggle(r.id)}
							/>
						</td>
						{COLUMNS.map((c) => (
							<td key={c.field}>{r[c.field]}</td>
						))}
					</tr>
				))}
			</tbody>
		</table>
	)
}
