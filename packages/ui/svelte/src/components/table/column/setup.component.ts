/**
 * setupTableColumn — setup-слой заголовка колонки.
 *
 * Один контекст над экземпляром колонки, как у Vue, React и Solid. Фасада у
 * части нет: колонка — элемент своей коллекции, а лифт таблицы отдаёт движок
 * строк, и расширение элемента записало бы её строкой. Место колонки знает
 * коллекция колонок, а рисует заголовки таблица — по показанным колонкам.
 *
 * Логики здесь нет: имя кнопки сортировки — `TTableColumnNamesPlugin`, имя
 * заголовка и ручки — `TTableColumnIdsPlugin`, сортировку по нажатию кнопки —
 * расширение сортировки коллекции строк. Методы колонки состоянием не
 * отдаются, поэтому разметка берёт её инстанс (`ctrl`): кнопка сортировки
 * зовёт его `toggleSort()`.
 */

import { TableColumnDescriptor } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter, type TRootReceiver } from '../../../adapter'
import type { TableColumnProps } from './base.component'

export function setupTableColumn(
	getProps: () => TableColumnProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const adapter = createSvelteAdapterContext(TableColumnDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	})

	return useAdapter(adapter, getProps, receive)
}
