import { toRaw } from 'vue'
import {
	createAdapterContext,
	TCollectionItemExtension,
	TagsItemDescriptor,
	TagsCollectionItemDescriptor,
} from '@soldy/setup'
import { TTagsItemCollectionFacade } from '@soldy/core'
import type { ITagsItemProps, ITagsItem } from '@soldy/core'
import { useAdapter, VueElevatorFactory, useIcon, useSplitAttrs } from '../../../adapter'
import BaseTagsItem, { type TagsItemProps } from './base.component'

export default {
	name: '_TagsItem',
	inheritAttrs: false,
	extends: BaseTagsItem,
	setup(props: TagsItemProps, { emit }: any) {
		const adapter = createAdapterContext(TagsItemDescriptor(), {
			ctrl: toRaw(props.ctrl),
			props,
		})

		const itemAdapter = createAdapterContext(
			TagsCollectionItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle, defaultExtensions: [] },
		).use(TCollectionItemExtension, {
			item: adapter.instance,
			elevator: VueElevatorFactory,
		})

		const itemBinding = useAdapter<Record<string, any>, TTagsItemCollectionFacade>(
			itemAdapter,
			props,
			emit,
		)
		const ownerBinding = useAdapter<ITagsItemProps, ITagsItem>(adapter, props, emit)

		return {
			...itemBinding,
			...ownerBinding,
			context: itemAdapter.instance.context,
			closeIconTag: useIcon('close'),
			...useSplitAttrs(),
		}
	},
}
