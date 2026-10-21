/**
 * setupTabsItem — setup-слой таба.
 *
 * Два контекста, как у элементов Vue и Angular: собственный
 * (`TabsItemDescriptor` — текст, значение, закрываемость) и фасада
 * (`TabsCollectionItemDescriptor` — активность, порядок, итог закрываемости),
 * одной связкой. Расширение элемента берёт лифтом движок и регистратор набора —
 * ближайшего выше по документу — и отдаёт фасаду контекст таба. Порядок
 * связок — как у Vue: фасад первым, и в коллекцию таб входит, когда его
 * контекст принят, — при подключении элемента.
 */

import {
	TCollectionItemExtension,
	TabsCollectionItemDescriptor,
	TabsItemDescriptor,
} from '@soldy-ui/setup'
import type { ITabsItem, TTabsItemCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding, TUpdateListener } from '../../../adapter'
import { createWebcElevator } from '../../../adapter/elevator'

export function setupTabsItem(
	host: HTMLElement,
	ctrl: ITabsItem | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<ITabsItem, TTabsItemCollectionFacade> {
	const adapter = createWebcAdapterContext(host, TabsItemDescriptor(), { ctrl, props })

	const itemAdapter = createWebcAdapterContext(
		host,
		TabsCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, {
		item: adapter.instance,
		elevator: createWebcElevator(host),
	})

	const item = useCollectionAdapter(itemAdapter, host, onUpdate)
	const owner = useAdapter(adapter, host, onUpdate)

	return joinBindings(owner, item)
}
