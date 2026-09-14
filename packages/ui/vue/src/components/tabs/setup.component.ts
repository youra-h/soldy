import {
	TCollectionExtension,
	TDragAndDropCollectionExtension,
	TabsDescriptor,
	TabsCollectionDescriptor,
} from '@soldy/setup'
import { TTabsCollectionFacade } from '@soldy/core'
import type { ITabsCollectionProps } from '@soldy/core'
import {
	useAdapter,
	useCollectionAdapter,
	VueElevatorFactory,
	createVueAdapterContext,
	type SetupContext,
} from '../../adapter'
import BaseTabs, { type TabsProps } from './base.component'
import { type ITabsComponentProps, type ITabs } from '@soldy/core'

export default {
	name: '_Tabs',
	extends: BaseTabs,
	setup(props: TabsProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(TabsDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		const refs = useAdapter<ITabsComponentProps, ITabs>(adapter, props, emit)

		const collectionAdapter = createVueAdapterContext(
			TabsCollectionDescriptor(),
			{
				props,
				// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
				// не создаёт, лишь доложит недостающие расширения в неё же.
				// Не дали — соберёт свою. Развилка в `resolveEngine`
				options: { owner: adapter.instance, engine: props.engine },
			},
			{ bundle: adapter.bundle, defaultExtensions: [] },
		)
			.use(TCollectionExtension, { elevator: VueElevatorFactory })
			.use(TDragAndDropCollectionExtension, { elevator: VueElevatorFactory })

		const refsCollection = useCollectionAdapter<ITabsCollectionProps, TTabsCollectionFacade>(
			collectionAdapter,
			props,
			emit,
		)

		return { ...refs, ...refsCollection }
	},
}
