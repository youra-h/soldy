/**
 * setupMenuItem — setup-слой пункта меню.
 *
 * Два контекста, как у Vue: собственный (`MenuItemDescriptor` — текст и
 * значение пункта) и фасада (`MenuCollectionItemDescriptor` — вход в
 * коллекцию меню), одной связкой. Расширение пункта берёт лифтом движок и
 * регистратор меню — ближайшего выше по документу, а у пункта в панели —
 * от её якоря, — и отдаёт фасаду контекст пункта: через него шаблон зовёт
 * нажатие (`adapters.menu.choose()`). Порядок связок — как у Vue: фасад первым,
 * и в коллекцию пункт входит, когда его контекст принят, — при подключении.
 */

import {
	MenuCollectionItemDescriptor,
	MenuItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import type { IMenuItem, TMenuItemCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding, TUpdateListener } from '../../../adapter'
import { createWebcElevator } from '../../../adapter/elevator'

export function setupMenuItem(
	host: HTMLElement,
	ctrl: IMenuItem | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IMenuItem, TMenuItemCollectionFacade> {
	const adapter = createWebcAdapterContext(host, MenuItemDescriptor(), { ctrl, props })

	const itemAdapter = createWebcAdapterContext(
		host,
		MenuCollectionItemDescriptor(),
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
