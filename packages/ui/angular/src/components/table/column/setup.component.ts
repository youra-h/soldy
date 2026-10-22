import { TableColumnDescriptor } from '@soldy-ui/setup'
import type { ITableColumn } from '@soldy-ui/core'
import { createAngularAdapterContext, useAdapter } from '../../../adapter'
import type { TBinding } from '../../../adapter'

/** Фасада у колонки нет: лифт таблицы отдаёт движок строк, и колонка вошла бы в него строкой. */
export function setupTableColumn(
	ctrl: ITableColumn | undefined,
	props: object,
): TBinding<ITableColumn> {
	const adapter = createAngularAdapterContext(TableColumnDescriptor(), { ctrl, props })

	return useAdapter(adapter)
}
