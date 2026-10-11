/**
 * useSetupTableColumn — setup-слой заголовка колонки (аналог setup.component.ts во Vue).
 *
 * Один контекст над экземпляром колонки, как у Vue. Фасада у части нет:
 * колонка — элемент своей коллекции, а лифт таблицы отдаёт движок строк, и
 * расширение элемента записало бы её строкой. Место колонки знает коллекция
 * колонок, а рисует заголовки таблица — по показанным колонкам.
 */

import { TableColumnDescriptor } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../../adapter'
import type { TableColumnProps } from './base.component'

export function useSetupTableColumn(props: TableColumnProps) {
	const { contexts: adapter } = useAdapterContext((create) =>
		create(TableColumnDescriptor(), { ctrl: props.ctrl, props }),
	)

	return useAdapter(adapter, props)
}
