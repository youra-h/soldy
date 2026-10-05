import {
	TCollectionItemExtension,
	TableRowDescriptor,
	TableCollectionRowDescriptor,
} from '@soldy-ui/setup'
import {
	useAdapter,
	VueElevatorFactory,
	createVueAdapterContext,
	type SetupContext,
} from '../../../adapter'
import BaseTableRow, { type TableRowProps } from './base.component'

/**
 * Строка таблицы: свой контекст и контекст фасада строки на одном наборе.
 * Своего у строки в разметке нет — запись, «выключена» и наборы ей пишут
 * данные и таблица, ячейки и имя строки отдаёт фасад.
 *
 * Чекбокс выбора строки — экземпляр, который держит таблица; разметка берёт
 * его у контекста строки (`context.adapters.table`) и только в ячейке выбора,
 * поэтому у таблицы без выбора чекбоксов строк нет вовсе.
 */
export default {
	name: '_TableRow',
	extends: BaseTableRow,
	setup(props: TableRowProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(TableRowDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		const itemAdapter = createVueAdapterContext(
			TableCollectionRowDescriptor(),
			{ props },
			{ bundle: adapter.bundle },
		).use(TCollectionItemExtension, {
			item: adapter.instance,
			elevator: VueElevatorFactory,
		})

		const itemBinding = useAdapter(itemAdapter, props, emit)
		const ownerBinding = useAdapter(adapter, props, emit)

		return { ...itemBinding, ...ownerBinding, context: itemAdapter.instance.context }
	},
}
