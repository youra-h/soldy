/**
 * setupTabsContent — setup-слой панели таба.
 *
 * Два контекста, как у таба: собственный (`TabsContentDescriptor` — `value`
 * панели) и фасада (`TabsCollectionContentDescriptor` — активность связанного
 * таба), одной связкой. Панель сама о коллекции ничего не знает: таб по
 * `value` находит `TTabsContentBindingExtension` лифтом — в движке набора,
 * ближайшего выше по документу, — он же пишет сторону панели в её `aria`.
 *
 * Табы набора к сборке панели уже в коллекции: панели — слот `content`, после
 * списка табов, и подключаются они в порядке документа, — и из данных, и из
 * разметки. Таб, вошедший позже, панель находит, когда её контекст принят:
 * тогда она подписана на `item:added`. Порядок связок — как у Vue: фасад
 * первым.
 */

import {
	TTabsContentBindingExtension,
	TabsCollectionContentDescriptor,
	TabsContentDescriptor,
} from '@soldy-ui/setup'
import type { ITabsContent, TTabsContentCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding, TUpdateListener } from '../../../adapter'
import { createWebcElevator } from '../../../adapter/elevator'

export function setupTabsContent(
	host: HTMLElement,
	ctrl: ITabsContent | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<ITabsContent, TTabsContentCollectionFacade> {
	const adapter = createWebcAdapterContext(host, TabsContentDescriptor(), { ctrl, props })

	const contentAdapter = createWebcAdapterContext(
		host,
		TabsCollectionContentDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TTabsContentBindingExtension, {
		content: adapter.instance,
		elevator: createWebcElevator(host),
	})

	const content = useCollectionAdapter(contentAdapter, host, onUpdate)
	const owner = useAdapter(adapter, host, onUpdate)

	return joinBindings(owner, content)
}
