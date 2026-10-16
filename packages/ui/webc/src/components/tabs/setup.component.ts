/**
 * setupTabs — setup-слой Tabs.
 *
 * Два контекста, как у Vue и Angular: свой (`TabsDescriptor`) и фасада
 * коллекции (`TabsCollectionDescriptor`) на общем наборе, одной связкой.
 *
 * Расширения коллекции опускают движок и регистратор табов лифтом — хосту
 * набора: их находят вверх по документу и табы, и панели — таб входит в
 * коллекцию набора, панель находит в её движке свой таб.
 *
 * `engine` — готовая коллекция снаружи, свойство элемента (`el.engine`):
 * фасад работает на ней, а без неё собирает свою (`completeEngine`).
 */

import {
	TCollectionExtension,
	TDragAndDropCollectionExtension,
	TabsCollectionDescriptor,
	TabsDescriptor,
} from '@soldy-ui/setup'
import type { ITabs, TTabsCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

export function setupTabs(
	host: HTMLElement,
	ctrl: ITabs | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<ITabs, TTabsCollectionFacade> {
	const adapter = createWebcAdapterContext(host, TabsDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter, host, onUpdate)
	const elevator = createWebcElevator(host)

	const collectionAdapter = createWebcAdapterContext(
		host,
		TabsCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine: props['engine'] } },
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator })
		.use(TDragAndDropCollectionExtension, { elevator })

	return joinBindings(owner, useCollectionAdapter(collectionAdapter, adapter, host, onUpdate))
}
