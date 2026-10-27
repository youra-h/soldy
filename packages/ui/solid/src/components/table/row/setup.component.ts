import {
	TCollectionItemExtension,
	TableCollectionRowDescriptor,
	TableRowDescriptor,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useOwnerAdapter,
	joinBindings,
	useCollectionAdapter,
	useElevator,
} from '../../../adapter'
import type { TableRowProps } from './base.component'

/** `context` — разметке: чекбокс строки она берёт у item-адаптера таблицы. */
export function setupTableRow(props: TableRowProps) {
	const { elevator } = useElevator()
	const adapter = createSolidAdapterContext(TableRowDescriptor(), { ctrl: props.ctrl, props })
	const owner = useOwnerAdapter(adapter, props)

	const item = createSolidAdapterContext(
		TableCollectionRowDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	const itemBinding = useCollectionAdapter(item, props, owner.forwardProps)

	return { ...joinBindings(owner, itemBinding), context: item.instance.context }
}
