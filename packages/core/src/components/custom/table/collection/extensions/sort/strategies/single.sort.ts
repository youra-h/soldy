import { FIRST_DIRECTION, nextDirection } from './direction'
import type { TTableColumnSort } from '../types'
import type { ITableSortStrategy } from './types'

/**
 * Одна колонка. Форма состояния — первая запись: из списка, оставшегося от
 * `multiple` или записанного снаружи, — колонка с высшим приоритетом.
 * Сортировка по другой колонке заменяет прежнюю, по той же — меняет её
 * направление.
 */
export class TSingleSort implements ITableSortStrategy {
	resolve(sort: readonly TTableColumnSort[]): TTableColumnSort[] {
		return sort.slice(0, 1)
	}

	toggle(sort: readonly TTableColumnSort[], field: string): TTableColumnSort[] {
		const current: TTableColumnSort | undefined = sort[0]

		if (current?.field !== field) return [{ field, direction: FIRST_DIRECTION }]

		const direction = nextDirection(current.direction)

		return direction ? [{ field, direction }] : []
	}
}
