import {
	TCollectionItemExtension,
	TableCollectionRowDescriptor,
	TableRowDescriptor,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../../adapter'
import type { TableRowProps } from './base.component'

/** `context` — разметке: чекбокс строки она берёт у item-адаптера таблицы. */
export function setupTableRow(props: TableRowProps) {
	const { elevator } = useElevator()
	const adapter = createSolidAdapterContext(TableRowDescriptor(), { ctrl: props.ctrl, props })
	const owner = useAdapter(adapter, props)

	const item = createSolidAdapterContext(
		TableCollectionRowDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	return { ...useCollectionAdapter(item, props, owner), context: item.instance.context }
}
