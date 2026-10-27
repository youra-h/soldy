import {
	RadioGroupCollectionItemDescriptor,
	RadioGroupItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useAdapter,
	joinBindings,
	useCollectionAdapter,
	useElevator,
} from '../../../adapter'
import type { RadioGroupItemProps } from './base.component'

export function setupRadioGroupItem(props: RadioGroupItemProps) {
	const { elevator } = useElevator()
	const adapter = createSolidAdapterContext(RadioGroupItemDescriptor(), {
		ctrl: props.ctrl,
		props,
	})

	const item = createSolidAdapterContext(
		RadioGroupCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter, elevator })

	const itemBinding = useCollectionAdapter(item, props)
	const owner = useAdapter(adapter, props)

	return { ...joinBindings(owner, itemBinding), context: item.instance.context }
}
