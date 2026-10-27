import {
	TCollectionItemExtension,
	TableCollectionRowDescriptor,
	TableRowDescriptor,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../../adapter'
import type { TableRowProps } from './base.component'

export function useSetupTableRow(props: TableRowProps) {
	const {
		contexts: [adapter, item],
	} = useAdapterContext((create, elevator) => {
		const adapter = create(TableRowDescriptor(), { ctrl: props.ctrl, props })

		const item = create(
			TableCollectionRowDescriptor(),
			{ props },
			{ bundle: adapter.bundle },
		).use(TCollectionItemExtension, { item: adapter, elevator })

		return [adapter, item] as const
	})

	// Чекбокс выбора строки разметка берёт у item-адаптера таблицы
	return {
		...useCollectionAdapter(useAdapter(adapter, props), item, props),
		context: item.instance.context,
	}
}
