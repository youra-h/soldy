import type { TTableColumnSort } from './types'

/**
 * Записи состояния без повторов поля: повтор — по первой, у неё приоритет
 * выше. Записи — свои копии: список и объекты, которые дал потребитель, у
 * расширения не остаются, и правка их снаружи состояния не меняет.
 */
export function normalizeSort(sort: readonly TTableColumnSort[]): TTableColumnSort[] {
	const fields = new Set<string>()
	const normalized: TTableColumnSort[] = []

	for (const { field, direction } of sort) {
		if (fields.has(field)) continue

		fields.add(field)
		normalized.push({ field, direction })
	}

	return normalized
}

/**
 * То же состояние: те же поля с теми же направлениями в том же порядке.
 * По содержимому, а не по ссылке: список, собранный заново, — литерал в
 * разметке или эхо модели — то же состояние.
 */
export function sameSort(a: readonly TTableColumnSort[], b: readonly TTableColumnSort[]): boolean {
	return (
		a.length === b.length &&
		a.every(
			(entry, index) =>
				entry.field === b[index].field && entry.direction === b[index].direction,
		)
	)
}
