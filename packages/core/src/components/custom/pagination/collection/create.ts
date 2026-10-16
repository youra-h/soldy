import { createComponentEngine } from '../../../base/collection/create/internal'
import type { TCreateEngineOptions } from '../../../base'
import { paginationExtensions } from './factory'
import type { TPaginationCollection } from './types'
import type { IPagination } from '../types'
import type { IPaginationItem } from '../item/types'

/**
 * Коллекция Pagination целиком. `owner` необязателен: пагинация — опция
 * движка, её пишет `<Pagination>`, когда движок передадут компоненту, или код
 * — `engine.options.set({ owner })`. Страницы окна кладёт в коллекцию сама
 * пагинация, когда приходит.
 */
export function createEnginePagination(
	options: TCreateEngineOptions<IPaginationItem> & { owner?: IPagination } = {},
): TPaginationCollection {
	return createComponentEngine(paginationExtensions(), options)
}
