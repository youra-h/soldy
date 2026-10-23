import {
	RadioGroupCollectionItemDescriptor,
	RadioGroupItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useAdapter,
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
	const owner = useAdapter(adapter, props)

	const item = createSolidAdapterContext(
		RadioGroupCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	return { ...useCollectionAdapter(item, props, owner), context: item.instance.context }
}
