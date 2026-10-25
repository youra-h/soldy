import { useState } from 'react'
import { Checkbox, MantineProvider, Table, UnstyledButton } from '@mantine/core'
import '@mantine/core/styles.css'
import { COLUMNS, type TRec } from '../data'
import { nextSort, sorted, type TSort } from '../sort'

export const sel = {
	selectAll: 'thead input[type="checkbox"]',
	sort: 'thead th[data-col="name"] button',
}

/**
 * Mantine `Table` по примерам документации «Table with selection» и «Sort
 * table»: выбор и сортировку держит приложение, Mantine даёт теги и
 * `Checkbox`. Готовой таблицы с выбором у Mantine нет.
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
		<MantineProvider>
			<Table>
				<Table.Thead>
					<Table.Tr>
						<Table.Th>
							<Checkbox
								aria-label="Выбрать все"
								checked={all}
								indeterminate={selected.size > 0 && !all}
								onChange={() =>
									setSelected(all ? new Set() : new Set(rows.map((r) => r.id)))
								}
							/>
						</Table.Th>
						{COLUMNS.map((c) => (
							<Table.Th key={c.field} data-col={c.field}>
								<UnstyledButton onClick={() => setSort(nextSort(sort, c.field))}>
									{c.text}
								</UnstyledButton>
							</Table.Th>
						))}
					</Table.Tr>
				</Table.Thead>
				<Table.Tbody>
					{sorted(rows, sort).map((r) => (
						<Table.Tr key={r.id}>
							<Table.Td>
								<Checkbox
									aria-label="Выбрать строку"
									checked={selected.has(r.id)}
									onChange={() => toggle(r.id)}
								/>
							</Table.Td>
							{COLUMNS.map((c) => (
								<Table.Td key={c.field}>{r[c.field]}</Table.Td>
							))}
						</Table.Tr>
					))}
				</Table.Tbody>
			</Table>
		</MantineProvider>
	)
}
