import {
	TCollectionItemExtension,
	TagsItemDescriptor,
	TagsCollectionItemDescriptor,
} from '@soldy/setup'
import {
	useAdapter,
	VueElevatorFactory,
	useIcon,
	useSplitAttrs,
	createVueAdapterContext,
	type SetupContext,
} from '../../../adapter'
import BaseTagsItem, { type TagsItemProps } from './base.component'

export default {
	name: '_TagsItem',
	inheritAttrs: false,
	extends: BaseTagsItem,
	setup(props: TagsItemProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(TagsItemDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		const itemAdapter = createVueAdapterContext(
			TagsCollectionItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle },
		).use(TCollectionItemExtension, {
			item: adapter.instance,
			elevator: VueElevatorFactory,
		})

		const itemBinding = useAdapter(itemAdapter, props, emit)
		const ownerBinding = useAdapter(adapter, props, emit)

		return {
			...itemBinding,
			...ownerBinding,
			context: itemAdapter.instance.context,
			closeIconTag: useIcon('close'),
			...useSplitAttrs(),
		}
	},
}
