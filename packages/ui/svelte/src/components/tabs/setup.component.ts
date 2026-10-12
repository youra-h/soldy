/**
 * setupTabs — setup-слой Tabs.
 *
 * Два контекста, как у Vue: свой (`TabsDescriptor`) и фасада коллекции
 * (`TabsCollectionDescriptor`) на общем наборе, с тем же id монтирования.
 *
 * Расширения коллекции опускают движок и регистратор табов лифтом
 * (`setContext`): его читают и табы, и панели — таб входит в коллекцию набора,
 * панель находит в её движке свой таб.
 */

import {
	TCollectionExtension,
	TDragAndDropCollectionExtension,
	TabsCollectionDescriptor,
	TabsDescriptor,
} from '@soldy-ui/setup'
import {
	SvelteElevatorFactory,
	createSvelteAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { TabsProps } from './base.component'

export function setupTabs(getProps: () => TabsProps, mountId: string) {
	const props = getProps()
	const adapter = createSvelteAdapterContext(TabsDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	})
	const owner = useAdapter(adapter, getProps)

	const collectionAdapter = createSvelteAdapterContext(
		TabsCollectionDescriptor(),
		{
			props,
			mountId,
			// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
			// не создаёт, лишь доложит недостающие расширения в неё же.
			// Не дали — соберёт свою. Развилка в `completeEngine`
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator: SvelteElevatorFactory })
		.use(TDragAndDropCollectionExtension, { elevator: SvelteElevatorFactory })

	const collectionBinding = useCollectionAdapter(
		collectionAdapter,
		getProps,
		() => owner.forwardProps,
	)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		attachElement: owner.attachElement,
		state: joinState(owner.state, collectionBinding.state),

		get forwardProps() {
			return collectionBinding.forwardProps
		},
	}
}
