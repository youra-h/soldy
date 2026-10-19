/**
 * setupTableRow — setup-слой строки таблицы.
 *
 * Два контекста, как у элементов Vue, React и ListBox: собственный
 * (`TableRowDescriptor` — запись, «выключена», наборы) и фасада
 * (`TableCollectionRowDescriptor` — выбор, ячейки, имя строки, выбор строк).
 * Расширение элемента берёт лифтом движок и регистратор строк таблицы — из
 * слоя, который строка увидела при сборке (`useElevator`), — и отдаёт фасаду
 * контекст строки.
 *
 * В коллекцию строка входит, когда контекст фасада принят, — при выполнении
 * тела компонента, и на сервере тоже.
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
	createSolidAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../../adapter'
import type { TableRowProps } from './base.component'

export function setupTableRow(props: TableRowProps) {
	const { elevator } = useElevator()
	const adapter = createSolidAdapterContext(TableRowDescriptor(), { ctrl: props.ctrl, props })
	const owner = useAdapter(adapter, props)

	const item = createSolidAdapterContext(
		TableCollectionRowDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	const facade = useCollectionAdapter(item, props, owner.forwardProps)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		ref: owner.ref,
		state: joinState(facade.state, owner.state),
		context: item.instance.context,
		forwardProps: facade.forwardProps,
	}
}
