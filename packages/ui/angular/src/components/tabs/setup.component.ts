import {
	TCollectionExtension,
	TDragAndDropCollectionExtension,
	TabsCollectionDescriptor,
	TabsDescriptor,
} from '@soldy-ui/setup'
import type { ITabs, ITabsProps, TTabsCollectionFacade } from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupTabs — setup-слой Tabs.
 *
 * Два контекста, как у Vue и Svelte: свой (`TabsDescriptor`) и фасада
 * коллекции (`TabsCollectionDescriptor`) на общем наборе, одной связкой.
 *
 * Расширения коллекции опускают движок и регистратор табов лифтом — в слой
 * набора (`provideElevator()` в его `providers`): его читают и табы, и панели
 * — таб входит в коллекцию набора, панель находит в её движке свой таб.
 *
 * `engine` — готовая коллекция снаружи, вход набора: фасад работает на ней, а
 * без неё собирает свою (`completeEngine`).
 */
export function setupTabs(
	ctrl: ITabs | undefined,
	props: object,
	engine: ITabsProps['engine'],
): TBinding<ITabs, TTabsCollectionFacade> {
	const adapter = createAngularAdapterContext(TabsDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter)

	const collectionAdapter = createAngularAdapterContext(
		TabsCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine } },
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator: AngularElevatorFactory })
		.use(TDragAndDropCollectionExtension, { elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(collectionAdapter))
}
