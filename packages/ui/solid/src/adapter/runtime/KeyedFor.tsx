/**
 * Петля по ключу записи: узел живёт, пока в списке есть запись с его ключом,
 * а новую запись получает аксессором. `drawn` коллекции — новые записи на
 * каждую смену, и `<For>` по ссылке пересоздавал бы строки вместе с фокусом.
 * Окна гидратации переживает, как `flow.ts`. AGENTS.md (Solid), «Ветки и петли».
 */

import { createRoot, createSignal, onCleanup, untrack, type Accessor, type JSX } from 'solid-js'
import { createHeldMemo } from '../common/hydration'

export type TKeyedForProps<TEntry, TKey> = {
	each: readonly TEntry[] | undefined
	/** Ключ записи: у записей одного узла он один и тот же. */
	by: (entry: TEntry) => TKey
	children: (entry: Accessor<TEntry>) => JSX.Element
}

type TRow<TEntry> = {
	readonly node: JSX.Element
	readonly update: (entry: TEntry) => void
	readonly dispose: () => void
}

export function KeyedFor<TEntry, TKey>(props: TKeyedForProps<TEntry, TKey>): JSX.Element {
	const rows = new Map<TKey, TRow<TEntry>>()

	// Строка — в своём корне под владельцем петли: контекст места тот же
	const createRow = (entry: TEntry): TRow<TEntry> =>
		createRoot((dispose) => {
			const [current, setCurrent] = createSignal(entry)

			return {
				node: props.children(current),
				update: (next) => setCurrent(() => next),
				dispose,
			}
		})

	onCleanup(() => {
		for (const row of rows.values()) row.dispose()

		rows.clear()
	})

	// Узлы и ключи — не зависимости петли: она идёт только за списком
	const reconcile = (entries: readonly TEntry[]): JSX.Element[] =>
		untrack(() => {
			const seen = new Set<TKey>()
			const result = entries.map((entry) => {
				const key = props.by(entry)
				let row = rows.get(key)

				if (row) row.update(entry)
				else rows.set(key, (row = createRow(entry)))

				seen.add(key)

				return row.node
			})

			for (const [key, row] of rows) {
				if (seen.has(key)) continue

				row.dispose()
				rows.delete(key)
			}

			return result
		})

	const nodes = createHeldMemo(
		props,
		(source) => reconcile(source.each ?? []),
		(source) => source.each,
	)

	return <>{nodes()}</>
}
