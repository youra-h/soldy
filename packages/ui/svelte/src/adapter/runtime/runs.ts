/** Серия подряд идущих элементов списка с одним значением признака. */
export type TRun<T, TValue> = {
	readonly value: TValue
	readonly items: readonly T[]
}

/**
 * Список сериями подряд идущих элементов с одним значением признака `key`:
 * `{#each runsOf(cells, 'rowHeader') as run}`, в серии — ветка по `run.value` и
 * петля по `run.items`. Ветка Svelte — блок с менеджером веток, эффектами и
 * якорем, и ветка по признаку в каждом элементе стоила бы их на элемент, а
 * сериями — на серию. Тот же приём, что пайп `soRuns` адаптера Angular.
 */
export function runsOf<T, K extends keyof T>(items: readonly T[], key: K): TRun<T, T[K]>[] {
	const runs: TRun<T, T[K]>[] = []
	let run: { value: T[K]; items: T[] } | undefined

	for (const item of items) {
		const value = item[key]

		if (!run || !Object.is(run.value, value)) {
			run = { value, items: [] }
			runs.push(run)
		}

		run.items.push(item)
	}

	return runs
}
