/**
 * setupTableRow — setup-слой строки таблицы.
 *
 * Два контекста, как у элементов Vue и у `ListBox.Item`: собственный
 * (`TableRowDescriptor` — запись, «выключена», наборы) и фасада
 * (`TableCollectionRowDescriptor` — выбор, ячейки, имя строки, выбор строк).
 * Расширение элемента берёт лифтом движок и регистратор строк таблицы и
 * отдаёт фасаду контекст строки.
 *
 * В коллекцию строка входит, когда контекст фасада принят, — при
 * инициализации компонента, и на сервере тоже.
 *
 * `context` отдаётся разметке явно: чекбокс выбора строки — экземпляр,
 * который держит таблица, и разметка берёт его у item-адаптера таблицы
 * (`context.adapters.table`) — и только в ячейке выбора, поэтому у таблицы
 * без выбора чекбоксов строк нет вовсе.
 */

import {
	TCollectionItemExtension,
	TableCollectionRowDescriptor,
	TableRowDescriptor,
} from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
	type TRootReceiver,
} from '../../../adapter'
import type { TableRowProps } from './base.component'

export function setupTableRow(
	getProps: () => TableRowProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const props = getProps()
	const adapter = createSvelteAdapterContext(TableRowDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	})
	const owner = useAdapter(adapter, getProps, receive)

	const item = createSvelteAdapterContext(
		TableCollectionRowDescriptor(),
		{ props, mountId },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	const facade = useCollectionAdapter(item, getProps, () => owner.forwardProps)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		attachElement: owner.attachElement,
		state: joinState(facade.state, owner.state),
		context: item.instance.context,

		get forwardProps() {
			return facade.forwardProps
		},
	}
}
