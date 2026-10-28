import {
	SelectCollectionItemDescriptor,
	SelectItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useAdapter,
	joinBindings,
	useCollectionAdapter,
	useElevator,
} from '../../../adapter'
import type { SelectItemProps } from './base.component'

export function setupSelectItem(props: SelectItemProps) {
	const { elevator } = useElevator()
	const adapter = createSolidAdapterContext(SelectItemDescriptor(), { ctrl: props.ctrl, props })

	const item = createSolidAdapterContext(
		SelectCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { adapter, elevator })

	const itemBinding = useCollectionAdapter(item, props)
	const owner = useAdapter(adapter, props)

	return { ...joinBindings(owner, itemBinding), context: item.instance.context }
}
