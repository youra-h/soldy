import { TableColumnDescriptor } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter } from '../../../adapter'
import type { TableColumnProps } from './base.component'

/**
 * Фасада у колонки нет: лифт таблицы отдаёт движок строк, и колонка вошла бы в него строкой.
 * Инстанс (`column`) — разметке: кнопка сортировки зовёт его `toggleSort()`.
 */
export function setupTableColumn(props: TableColumnProps) {
	const adapter = createSolidAdapterContext(TableColumnDescriptor(), { ctrl: props.ctrl, props })

	return { ...useAdapter(adapter, props), column: adapter.instance }
}
