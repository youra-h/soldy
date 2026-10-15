/**
 * setupTabs — setup-слой Tabs.
 *
 * Два контекста, как у Vue и Svelte: свой (`TabsDescriptor`) и фасада
 * коллекции (`TabsCollectionDescriptor`) на общем наборе. Оба собираются один
 * раз, при выполнении тела компонента; фасад делит набор табов, и id
 * монтирования у него набора.
 *
 * Расширения коллекции опускают движок и регистратор табов в слой лифта
 * набора (`useElevator`), детям его отдаёт `Elevate` в разметке: его читают и
 * табы, и панели — таб входит в коллекцию набора, панель находит в её движке
 * свой таб.
 */

import {
	TCollectionExtension,
	TDragAndDropCollectionExtension,
	TabsCollectionDescriptor,
	TabsDescriptor,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../adapter'
import type { TabsProps } from './base.component'

export function setupTabs(props: TabsProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(TabsDescriptor(), { ctrl: props.ctrl, props })
	const owner = useAdapter(adapter, props)

	const collectionAdapter = createSolidAdapterContext(
		TabsCollectionDescriptor(),
		{
			props,
			// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
			// не создаёт, лишь доложит недостающие расширения в неё же.
			// Не дали — соберёт свою. Развилка в `completeEngine`
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator })
		.use(TDragAndDropCollectionExtension, { elevator })

	const collectionBinding = useCollectionAdapter(collectionAdapter, props, owner.forwardProps)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		ref: owner.ref,
		state: joinState(owner.state, collectionBinding.state),
		forwardProps: collectionBinding.forwardProps,
		layer,
	}
}
