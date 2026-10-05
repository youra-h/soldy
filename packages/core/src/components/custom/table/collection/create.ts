import { createComponentEngine } from '../../../base/collection/create/internal'
import type { TCreateEngineOptions } from '../../../base'
import { tableExtensions } from './factory'
import type { TTableCollection } from './types'
import type { ITable } from '../types'
import type { ITableRow } from '../row/types'

/**
 * Коллекция строк таблицы целиком, с колонками. `owner` необязателен: владелец —
 * опция движка, его пишет таблица, когда движок передадут компоненту, или
 * код — `engine.options.set({ owner })`.
 *
 * Колонки задаются расширению колонок — `engine.extensions.columns.columns`:
 * их движок лежит в движке строк и уходит вместе с ним.
 */
export function createEngineTable(
	options: TCreateEngineOptions<ITableRow> & { owner?: ITable } = {},
): TTableCollection {
	return createComponentEngine(tableExtensions(), options)
}
