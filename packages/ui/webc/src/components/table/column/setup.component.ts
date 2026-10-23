/** Фасада нет: лифт отдаёт движок строк, и расширение элемента записало бы колонку строкой. */

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
