/**
 * setupPaginationItem — setup-слой страницы пагинации.
 *
 * Два контекста, как у страницы Vue и элемента ListBox: собственный
 * (`PaginationItemDescriptor` — ключ и текст страницы) и фасада
 * (`PaginationCollectionItemDescriptor` — членство в коллекции пагинации),
 * одной связкой. Расширение элемента берёт лифтом движок и регистратор
 * пагинации — ближайшей выше по документу — и отдаёт фасаду контекст
 * элемента: через него нажатие делает страницу текущей. Порядок связок — как
 * у Vue: фасад первым, и в коллекцию страница входит, когда её контекст
 * принят, — при подключении элемента.
 */

import {
	PaginationCollectionItemDescriptor,
	PaginationItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import type { IPaginationItem, TPaginationItemCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding, TUpdateListener } from '../../../adapter'
import { createWebcElevator } from '../../../adapter/elevator'

export function setupPaginationItem(
	host: HTMLElement,
	ctrl: IPaginationItem | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IPaginationItem, TPaginationItemCollectionFacade> {
	const adapter = createWebcAdapterContext(host, PaginationItemDescriptor(), { ctrl, props })

	const itemAdapter = createWebcAdapterContext(
		host,
		PaginationCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, {
		item: adapter.instance,
		elevator: createWebcElevator(host),
	})

	const item = useCollectionAdapter(itemAdapter, adapter, host, onUpdate)
	const owner = useAdapter(adapter, host, onUpdate)

	return joinBindings(owner, item)
}
