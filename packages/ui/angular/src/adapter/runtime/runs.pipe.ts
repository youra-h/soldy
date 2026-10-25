import { Pipe, type PipeTransform } from '@angular/core'

/** Серия подряд идущих элементов списка с одним значением признака. */
export type TRun<T, TValue> = {
	readonly value: TValue
	readonly items: readonly T[]
}

/**
 * Список сериями подряд идущих элементов с одним значением признака `key`:
 * `@for (run of cells | soRuns: 'rowHeader'; track $index)`, в серии — ветка
 * по `run.value` и петля по `run.items`. Блок Angular — своё представление с
 * якорем, и ветка по признаку в каждом элементе стоила бы представления на
 * элемент, а сериями — одного на серию. Пайп чистый: серии считаются заново
 * только на новый список.
 */
@Pipe({
	name: 'soRuns',
})
export class RunsPipe implements PipeTransform {
	transform<T, K extends keyof T>(items: readonly T[], key: K): TRun<T, T[K]>[] {
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
}
