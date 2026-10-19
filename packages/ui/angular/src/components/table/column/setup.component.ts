import { TableColumnDescriptor } from '@soldy-ui/setup'
import type { ITableColumn } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../../adapter'
import type { TBinding } from '../../../adapter'

/**
 * setupTableColumn — setup-слой заголовка колонки.
 *
 * Один контекст над экземпляром колонки, как у Vue. Фасада у части нет:
 * колонка — элемент своей коллекции, а лифт таблицы отдаёт движок строк, и
 * расширение элемента записало бы её строкой. Место колонки знает коллекция
 * колонок, а рисует заголовки таблица — по показанным колонкам.
 *
 * Логики здесь нет: имя кнопки сортировки — `TTableColumnNamesPlugin`, имя
 * заголовка и ручки — `TTableColumnIdsPlugin`, сортировку по нажатию кнопки —
 * расширение сортировки коллекции строк.
 */
export function setupTableColumn(
	ctrl: ITableColumn | undefined,
	props: object,
): TBinding<ITableColumn> {
	const adapter = createAngularAdapterContext(TableColumnDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
