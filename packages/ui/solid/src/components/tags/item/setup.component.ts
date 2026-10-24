import {
	TCollectionItemExtension,
	TagsCollectionItemDescriptor,
	TagsItemDescriptor,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	useAdapter,
	joinBindings,
	useCollectionAdapter,
	useElevator,
} from '../../../adapter'
import type { TagsItemProps } from './base.component'

export function setupTagsItem(props: TagsItemProps) {
	const { elevator } = useElevator()
	const adapter = createSolidAdapterContext(TagsItemDescriptor(), { ctrl: props.ctrl, props })
	const owner = useAdapter(adapter, props)

	const item = createSolidAdapterContext(
		TagsCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	const itemBinding = useCollectionAdapter(item, props, owner.forwardProps)

	return {
		...joinBindings(owner, itemBinding),
		context: item.instance.context,
		/** Строка — экземпляр, которым владеет тег: кнопка берёт его целиком (`ctrl`). */
		row: adapter.instance.row,
	}
}
