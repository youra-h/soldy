import { MenuCollectionDescriptor, MenuDescriptor, TCollectionExtension } from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../adapter'
import type { MenuProps } from './base.component'

export function setupMenu(props: MenuProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(MenuDescriptor(), { ctrl: props.ctrl, props })
	const owner = useAdapter(adapter, props)

	const collectionAdapter = createSolidAdapterContext(
		MenuCollectionDescriptor(),
		{
			props,
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator })

	return { ...useCollectionAdapter(collectionAdapter, props, owner), layer }
}
