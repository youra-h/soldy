/**
 * setupTableRow — setup-слой строки таблицы (`Table.Row`).
 *
 * Два контекста, как у Vue и у элементов ListBox: собственный
 * (`TableRowDescriptor` — запись, «выключена», наборы) и фасада строки
 * (`TableCollectionRowDescriptor` — выбор, ячейки, имя строки, включён ли
 * выбор и набор ячеек сетки), одной связкой. Расширение элемента берёт лифтом
 * движок и регистратор таблицы — ближайшей выше по документу — и отдаёт фасаду
 * контекст строки. Порядок связок — как у Vue: фасад первым, и в коллекцию
 * строка входит, когда её контекст принят, — при подключении элемента.
 *
 * Чекбокс выбора строки — экземпляр, который держит таблица: разметка берёт
 * его у контекста строки (`context.adapters.table`), и только в ячейке
 * выбора.
 */

import {
	TCollectionItemExtension,
	TableCollectionRowDescriptor,
	TableRowDescriptor,
} from '@soldy-ui/setup'
import type { ITableRow, TTableRowCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding, TUpdateListener } from '../../../adapter'
import { createWebcElevator } from '../../../adapter/elevator'

export function setupTableRow(
	host: HTMLElement,
	ctrl: ITableRow | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<ITableRow, TTableRowCollectionFacade> {
	const adapter = createWebcAdapterContext(host, TableRowDescriptor(), { ctrl, props })

	const itemAdapter = createWebcAdapterContext(
		host,
		TableCollectionRowDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, {
		item: adapter.instance,
		elevator: createWebcElevator(host),
	})

	const item = useCollectionAdapter(itemAdapter, host, onUpdate)
	const owner = useAdapter(adapter, host, onUpdate)

	return joinBindings(owner, item)
}
