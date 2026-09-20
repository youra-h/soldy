import {
	TCollectionExtension,
	TDragAndDropCollectionExtension,
	ListBoxDescriptor,
	ListBoxCollectionDescriptor,
} from '@soldy/setup'
import {
	useAdapter,
	useCollectionAdapter,
	VueElevatorFactory,
	createVueAdapterContext,
	type SetupContext,
} from '../../adapter'
import BaseListBox, { type ListBoxProps } from './base.component'

export default {
	name: '_ListBox',
	extends: BaseListBox,
	setup(props: ListBoxProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(ListBoxDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		const refs = useAdapter(adapter, props, emit)

		const collectionAdapter = createVueAdapterContext(
			ListBoxCollectionDescriptor(),
			{
				props,
				// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
				// не создаёт, лишь доложит недостающие расширения в неё же.
				// Не дали — соберёт свою. Развилка в `resolveEngine`
				options: { owner: adapter.instance, engine: props.engine },
			},
			{ bundle: adapter.bundle },
		)
			.use(TCollectionExtension, { elevator: VueElevatorFactory })
			.use(TDragAndDropCollectionExtension, { elevator: VueElevatorFactory })

		const refsCollection = useCollectionAdapter(collectionAdapter, props, emit)

		return { ...refs, ...refsCollection }
	},
}
