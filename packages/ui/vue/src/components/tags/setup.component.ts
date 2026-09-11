import { toRaw } from 'vue'
import {
	createAdapterContext,
	TCollectionExtension,
	TagsDescriptor,
	TagsCollectionDescriptor,
} from '@soldy/setup'
import { TTagsCollectionFacade } from '@soldy/core'
import type { ITagsCollectionProps } from '@soldy/core'
import { useAdapter, useCollectionAdapter, VueElevatorFactory } from '../../adapter'
import BaseTags, { type TagsProps } from './base.component'
import { type ITagsProps, type ITagsComponentProps, type ITags } from '@soldy/core'

export default {
	name: '_Tags',
	extends: BaseTags,
	setup(props: TagsProps, { emit }: any) {
		const adapter = createAdapterContext(TagsDescriptor(), {
			ctrl: toRaw(props.ctrl),
			props,
		})

		const refs = useAdapter<ITagsComponentProps, ITags>(adapter, props, emit)

		const collectionAdapter = createAdapterContext(
			TagsCollectionDescriptor(),
			{
				props,
				// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
				// не создаёт, лишь доложит недостающие расширения в неё же.
				// Не дали — соберёт свою. Развилка в `resolveEngine`
				options: { owner: adapter.instance, engine: toRaw(props.engine) },
			},
			{ bundle: adapter.bundle, defaultExtensions: [] },
		).use(TCollectionExtension, { elevator: VueElevatorFactory })

		const refsCollection = useCollectionAdapter<ITagsCollectionProps, TTagsCollectionFacade>(
			collectionAdapter,
			props,
			emit,
		)

		return { ...refs, ...refsCollection }
	},
}
