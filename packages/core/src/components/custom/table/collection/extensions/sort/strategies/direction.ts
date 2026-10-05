import type { TTableSortDirection } from '../types'

/** С какого направления колонка начинает сортировать. */
export const FIRST_DIRECTION: TTableSortDirection = 'asc'

/** Цикл направления колонки: по возрастанию → по убыванию → снята. */
const NEXT: Readonly<Record<TTableSortDirection, TTableSortDirection | undefined>> = {
	asc: 'desc',
	desc: undefined,
}

/** Следующее направление колонки; `undefined` — сортировка по ней снята. */
export function nextDirection(direction: TTableSortDirection): TTableSortDirection | undefined {
	return NEXT[direction]
}
