import { FIRST_DIRECTION, nextDirection } from './direction'
import type { TTableColumnSort } from '../types'
import type { ITableSortStrategy } from './types'

/**
 * Несколько колонок. Форма состояния — все записи. Сортировка по новой
 * колонке встаёт последней по приоритету, по той, что уже сортирует, — меняет
 * её направление на месте; снятая уходит, и колонки после неё поднимаются.
 */
export class TMultipleSort implements ITableSortStrategy {
	resolve(sort: readonly TTableColumnSort[]): TTableColumnSort[] {
		return [...sort]
	}

	toggle(sort: readonly TTableColumnSort[], field: string): TTableColumnSort[] {
		const index = sort.findIndex((entry) => entry.field === field)

		if (index < 0) return [...sort, { field, direction: FIRST_DIRECTION }]

		const direction = nextDirection(sort[index].direction)

		if (!direction) return sort.filter((_, position) => position !== index)

		return sort.map((entry, position) => (position === index ? { field, direction } : entry))
	}
}
