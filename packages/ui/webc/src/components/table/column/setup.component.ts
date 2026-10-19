/**
 * setupTableColumn — setup-слой заголовка колонки (`Table.Column`).
 *
 * Один контекст над экземпляром колонки, как у Vue: фасада у части нет —
 * колонка элемент своей коллекции, а лифт отдаёт движок строк, и расширение
 * элемента записало бы её строкой. Место колонки знает коллекция колонок, а
 * рисует заголовки таблица — по показанным колонкам.
 *
 * Логики здесь нет: имя кнопки сортировки — `TTableColumnNamesPlugin`, имя
 * заголовка и ручки — `TTableColumnIdsPlugin`, ручку — `TTableColumnResizePlugin`,
 * сортировку по нажатию кнопки — расширение сортировки коллекции строк.
 */

import { TableColumnDescriptor } from '@soldy-ui/setup'
import type { ITableColumn } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../../adapter'
import type { TBinding, TUpdateListener } from '../../../adapter'

export function setupTableColumn(
	host: HTMLElement,
	ctrl: ITableColumn | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<ITableColumn> {
	const adapter = createWebcAdapterContext(host, TableColumnDescriptor(), { ctrl, props })

	return useAdapter(adapter, host, onUpdate)
}
