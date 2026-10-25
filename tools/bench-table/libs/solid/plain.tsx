import { createMemo, createRenderEffect, createSignal, For } from 'solid-js'
import { createStore, produce, reconcile } from 'solid-js/store'
import { COLUMNS, type TRec } from '../data'
import { nextSort, sorted, type TSort } from '../sort'

export const sel = { selectAll: 'thead input[type="checkbox"]', sort: 'thead th[data-col="name"]' }

/**
 * Нижняя граница: таблица на голом Solid — `For` по строкам, нативные
 * чекбоксы, выбор в хранилище по `id`, сортировка по клику на заголовок. Как
 * голая таблица Vue: ни доступности сверх тегов, ни клавиатуры. `For`
 * сопоставляет строки по ссылке, поэтому новые записи сверяются с прежними по
 * `id` (`reconcile`): замена данных обновляет строки, а не пересобирает их, как
 * ключ строки у Vue и React.
 */
export function Bench(props: { rows: TRec[] }) {
	const [store, setStore] = createStore<{ rows: TRec[] }>({ rows: [] })
	const [selected, setSelected] = createStore<Record<string, boolean>>({})
	const [sort, setSort] = createSignal<TSort>(null)

	createRenderEffect(() => setStore('rows', reconcile(props.rows, { key: 'id' })))

	const shown = createMemo(() => sorted(store.rows, sort()))
	const count = createMemo(() => store.rows.filter((r) => selected[r.id]).length)
	const all = () => store.rows.length > 0 && count() === store.rows.length

	const toggleAll = () =>
		all()
			? setSelected(reconcile({}))
			: setSelected(
					produce((s) => {
						for (const r of store.rows) s[r.id] = true
					}),
				)

	return (
		<table>
			<thead>
				<tr>
					<th>
						<input type="checkbox" checked={all()} onChange={toggleAll} />
					</th>
					<For each={COLUMNS}>
						{(c) => (
							<th
								data-col={c.field}
								onClick={() => setSort(nextSort(sort(), c.field))}
							>
								{c.text}
							</th>
						)}
					</For>
				</tr>
			</thead>
			<tbody>
				<For each={shown()}>
					{(r) => (
						<tr>
							<td>
								<input
									type="checkbox"
									checked={selected[r.id] ?? false}
									onChange={() => setSelected(String(r.id), !selected[r.id])}
								/>
							</td>
							<For each={COLUMNS}>{(c) => <td>{r[c.field]}</td>}</For>
						</tr>
					)}
				</For>
			</tbody>
		</table>
	)
}
