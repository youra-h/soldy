import { TableColumnDescriptor } from '@soldy-ui/setup'
import { useAdapter, createVueAdapterContext, type SetupContext } from '../../../adapter'
import BaseTableColumn, { type TableColumnProps } from './base.component'

/**
 * Заголовок колонки: один контекст над экземпляром колонки. Фасада у части
 * нет: колонка — элемент своей коллекции, а лифт отдаёт движок строк, и
 * расширение элемента записало бы её строкой. Место колонки знает коллекция
 * колонок, а рисует заголовки таблица — по показанным колонкам.
 */
export default {
	name: '_TableColumn',
	extends: BaseTableColumn,
	setup(props: TableColumnProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(TableColumnDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		return useAdapter(adapter, props, emit)
	},
}
