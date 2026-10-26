import { TableColumnDescriptor } from '@soldy-ui/setup'
import {
	useAdapter,
	extendBinding,
	useExpose,
	roleIcon,
	createVueAdapterContext,
	type SetupContext,
} from '../../../adapter'
import BaseTableColumn, { type TableColumnProps } from './base.component'

/**
 * Заголовок колонки: один контекст над экземпляром колонки. Фасада у части
 * нет: колонка — элемент своей коллекции, а лифт отдаёт движок строк, и
 * расширение элемента записало бы её строкой. Место колонки знает коллекция
 * колонок, а рисует заголовки таблица — по показанным колонкам.
 *
 * Логики здесь нет: имя кнопки сортировки — `TTableColumnNamesPlugin`, имя
 * заголовка и ручки — `TTableColumnIdsPlugin`, сортировку по нажатию кнопки —
 * расширение сортировки коллекции строк.
 */
export default {
	name: '_TableColumn',
	extends: BaseTableColumn,
	expose: useExpose(),
	setup(props: TableColumnProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(TableColumnDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		return extendBinding(useAdapter(adapter, props, emit), {
			/**
			 * The state carries no methods of the column — the instance goes out:
			 * the sort button calls its `toggleSort()`.
			 */
			column: adapter.instance,
			sortIconTag: roleIcon('arrowUpward'),
		})
	},
}
