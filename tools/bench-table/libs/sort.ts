import type { TRec } from './data'

/**
 * Сравнение значений колонки — как у голой таблицы Vue: числа по величине.
 * Общее для страниц: им сортирует приложение, когда библиотека даёт только
 * заголовок с событием, и голые таблицы фреймворков.
 */
const collator = new Intl.Collator(undefined, { numeric: true })

export const compareBy = (field: string) => (a: TRec, b: TRec) =>
	collator.compare(String(a[field]), String(b[field]))

/** Направление сортировки: по колонке — по возрастанию, повторно — по убыванию. */
export type TSort = { field: string; dir: 1 | -1 } | null

export function nextSort(sort: TSort, field: string): TSort {
	return sort?.field === field ? { field, dir: sort.dir === 1 ? -1 : 1 } : { field, dir: 1 }
}

export function sorted(rows: TRec[], sort: TSort): TRec[] {
	if (!sort) return rows
	const compare = compareBy(sort.field)
	return [...rows].sort((a, b) => sort.dir * compare(a, b))
}
