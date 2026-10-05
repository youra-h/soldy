import { baseExtensions } from '../../../../base/collection/create/internal'
import type { TExtensionSet } from '../../../../base/collection/create/internal'
import TTableColumn from '../column.class'
import type { ITableColumn } from '../types'
import { TTableColumnsVisibilityExtension } from './extensions'

/**
 * Детали коллекции колонок — по порядку установки. См. `tabsExtensions`.
 *
 * Базовые детали — состав, порядок, жизнь колонок; `factory` строит
 * `TTableColumn` из данных. Своё — `visibility`: скрытая колонка не попадает
 * в выборку. Владельца у коллекции нет: колонки держит расширение `columns`
 * коллекции строк.
 */
export function tableColumnsExtensions(): TExtensionSet<ITableColumn> {
	return {
		...baseExtensions<ITableColumn>(TTableColumn),
		visibility: () => new TTableColumnsVisibilityExtension(),
	}
}
