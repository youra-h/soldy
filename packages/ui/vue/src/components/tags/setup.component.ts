import { TCollectionExtension, TagsDescriptor, TagsCollectionDescriptor } from '@soldy-ui/setup'
import {
	useAdapter,
	useCollectionAdapter,
	VueElevatorFactory,
	useIcon,
	createVueAdapterContext,
	type SetupContext,
} from '../../adapter'
import BaseTags, { type TagsProps } from './base.component'

export default {
	name: '_Tags',
	extends: BaseTags,
	setup(props: TagsProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(TagsDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		const refs = useAdapter(adapter, props, emit)

		const collectionAdapter = createVueAdapterContext(
			TagsCollectionDescriptor(),
			{
				props,
				// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
				// не создаёт, лишь доложит недостающие расширения в неё же.
				// Не дали — соберёт свою. Развилка в `resolveEngine`
				options: { owner: adapter.instance, engine: props.engine },
			},
			{ bundle: adapter.bundle },
		).use(TCollectionExtension, { elevator: VueElevatorFactory })

		const refsCollection = useCollectionAdapter(collectionAdapter, props, emit)

		return { ...refs, ...refsCollection, moreIconTag: useIcon('moreHoriz') }
	},
}
