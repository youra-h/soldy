/**
 * setupListBoxItem — setup-слой элемента ListBox.
 *
 * Два контекста, как у элементов Vue и Angular: собственный
 * (`ListBoxItemDescriptor` — текст и значение) и фасада
 * (`ListBoxCollectionItemDescriptor` — выбор, порядок, вид и сторона отметки
 * списка), одной связкой. Расширение элемента берёт лифтом движок и
 * регистратор списка — ближайшего выше по документу — и отдаёт фасаду
 * контекст элемента. Порядок связок — как у Vue: фасад первым, и в коллекцию
 * элемент входит, когда его контекст принят, — при подключении элемента.
 */

import {
	ListBoxCollectionItemDescriptor,
	ListBoxItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import type { IListBoxItem, TListBoxItemCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding, TUpdateListener } from '../../../adapter'
import { createWebcElevator } from '../../../adapter/elevator'

export function setupListBoxItem(
	host: HTMLElement,
	ctrl: IListBoxItem | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IListBoxItem, TListBoxItemCollectionFacade> {
	const adapter = createWebcAdapterContext(host, ListBoxItemDescriptor(), { ctrl, props })

	const itemAdapter = createWebcAdapterContext(
		host,
		ListBoxCollectionItemDescriptor(),
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
