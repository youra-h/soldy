/**
 * KeyedFor — петля по ключу записи: узел записи живёт, пока в списке есть
 * запись с его ключом, а сама запись доходит до узла аксессором.
 *
 * `<For>` Solid сравнивает записи по ссылке. Это годится, когда записи —
 * экземпляры элементов (`shown`): ссылка на элемент устойчива. А то, что
 * рисует коллекция (`drawn`), — новые записи на каждую смену (`drawnItem`),
 * и `<For>` на каждое добавление пересоздавал бы все элементы списка вместе с
 * их узлами и фокусом. Поэтому узел держит ключ записи (`entry.key`): запись с
 * тем же ключом — тот же узел, а новую запись он получает аксессором и рисует
 * её смену на месте. Ключ, пропавший из списка, снимает свой узел со всем, что
 * тот собрал, — так же, как `<For>`.
 *
 * Узлы живут в своих корнях, а их владелец — петля: контекст места у них тот
 * же, что у самой петли, — внутри `Elevate` владельца коллекции элементы видят
 * его слой.
 *
 * Окна гидратации петля переживает, как ветки и петли адаптера (`flow.ts`):
 * первое значение — живое, а пересчёт в окне читает список и до конца окна
 * отдаёт прежние узлы — новых строк нет, и записи до строк не доходят. После
 * окна петля строит, снимает и обновляет строки уже вне гидратации
 * (`../common/hydration.ts`, шапка).
 */

import {
	createMemo,
	createRoot,
	createSignal,
	onCleanup,
	untrack,
	type Accessor,
	type JSX,
} from 'solid-js'
import { UNCOMPUTED, awaitHydrationEnd, hydrating } from '../common/hydration'

export type TKeyedForProps<TEntry, TKey> = {
	/** Записи по порядку. */
	each: readonly TEntry[] | undefined
	/** Ключ записи: у записей одного узла он один и тот же. */
	by: (entry: TEntry) => TKey
	/** Узел записи; запись — аксессором, и её смена узел не пересоздаёт. */
	children: (entry: Accessor<TEntry>) => JSX.Element
}

/** Узел записи и то, чем петля им управляет. */
type TRow<TEntry> = {
	readonly node: JSX.Element
	/** Отдать узлу новую запись с его ключом. */
	readonly update: (entry: TEntry) => void
	/** Снять узел со всем, что он собрал. */
	readonly dispose: () => void
}

export function KeyedFor<TEntry, TKey>(props: TKeyedForProps<TEntry, TKey>): JSX.Element {
	const rows = new Map<TKey, TRow<TEntry>>()

	/** Узел новой записи — в своём корне, под владельцем петли. */
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

	const nodes = createMemo<JSX.Element[], typeof UNCOMPUTED>((previous) => {
		const entries = props.each ?? []

		// Пересчитано в окне гидратации — прежние узлы, а после окна петля
		// пересчитается по сигналу и дойдёт до строк
		if (previous !== UNCOMPUTED && hydrating()) {
			awaitHydrationEnd()

			return previous
		}

		// Узлы и ключи — не зависимости петли: она идёт только за списком
		return untrack(() => {
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
	}, UNCOMPUTED)

	return <>{nodes()}</>
}
