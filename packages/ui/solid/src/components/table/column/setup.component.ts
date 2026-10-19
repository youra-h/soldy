/**
 * setupTableColumn — setup-слой заголовка колонки.
 *
 * Один контекст над экземпляром колонки, как у Vue и React. Фасада у части
 * нет: колонка — элемент своей коллекции, а лифт таблицы отдаёт движок строк,
 * и расширение элемента записало бы её строкой. Место колонки знает коллекция
 * колонок, а рисует заголовки таблица — по показанным колонкам.
 *
 * Логики здесь нет: имя кнопки сортировки — `TTableColumnNamesPlugin`, имя
 * заголовка и ручки — `TTableColumnIdsPlugin`, сортировку по нажатию кнопки —
 * расширение сортировки коллекции строк. Методы колонки состоянием не
 * отдаются, поэтому разметке уходит её инстанс (`column`): кнопка сортировки
 * зовёт его `toggleSort()`.
 */

import { TableColumnDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../../adapter'
import type { TableColumnProps } from './base.component'

export function setupTableColumn(props: TableColumnProps) {
	const adapter = createSolidAdapterContext(TableColumnDescriptor(), { ctrl: props.ctrl, props })

	return { ...useAdapter(adapter, props), column: adapter.instance }
}
