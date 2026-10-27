import { MenuCollectionDescriptor, MenuDescriptor, TCollectionExtension } from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useOwnerAdapter,
	joinBindings,
	useCollectionAdapter,
	useElevator,
} from '../../adapter'
import type { MenuProps } from './base.component'

export function setupMenu(props: MenuProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(MenuDescriptor(), { ctrl: props.ctrl, props })
	const owner = useOwnerAdapter(adapter, props)

	const collectionAdapter = createSolidAdapterContext(
		MenuCollectionDescriptor(),
		{
			props,
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator })

	const collectionBinding = useCollectionAdapter(collectionAdapter, props, owner.forwardProps)

	return { ...joinBindings(owner, collectionBinding), layer }
}
