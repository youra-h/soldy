import {
	RadioGroupCollectionDescriptor,
	RadioGroupDescriptor,
	TCollectionExtension,
	TFieldControlExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../adapter'
import type { RadioGroupProps } from './base.component'

export function setupRadioGroup(props: RadioGroupProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(RadioGroupDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TFieldControlExtension, { elevator })
	const owner = useAdapter(adapter, props)

	const collectionAdapter = createSolidAdapterContext(
		RadioGroupCollectionDescriptor(),
		{
			props,
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator })

	return { ...useCollectionAdapter(collectionAdapter, props, owner), layer }
}
