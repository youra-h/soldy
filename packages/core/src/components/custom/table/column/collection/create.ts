import { completeEngine, fillEngine } from '../../../../base/collection/create/internal'
import type { TCreateEngineOptions } from '../../../../base'
import { tableColumnsExtensions } from './factory'
import type { TTableColumnsCollection } from './types'
import type { ITableColumn } from '../types'

/**
 * Коллекция колонок целиком.
 *
 * Ключ колонки — её `field`: на нём сверка состава (`trackBy`), поэтому
 * повтор теми же данными оставляет те же экземпляры, а с ними их ширину и
 * место. Ключ — свойство самой коллекции колонок, а не того, кто её держит.
 */
export function createEngineTableColumns(
	options: TCreateEngineOptions<ITableColumn> = {},
): TTableColumnsCollection {
	const engine: TTableColumnsCollection = completeEngine(undefined, tableColumnsExtensions())

	engine.extensions.batch.trackBy = (column) => column.field

	return fillEngine(engine, options.items)
}
