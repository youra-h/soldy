/**
 * setupSelectItem — setup-слой опции Select.
 *
 * Два контекста, как у элементов Vue и ListBox: собственный
 * (`SelectItemDescriptor` — текст и значение) и фасада
 * (`SelectCollectionItemDescriptor` — выбор, порядок, сторона отметки поля),
 * одной связкой. Расширение элемента берёт лифтом движок и регистратор Select
 * — ближайшего выше по документу, а из увезённой панели — от её якоря, корня
 * Select, — и отдаёт фасаду контекст опции. Порядок связок — как у Vue: фасад
 * первым, и в коллекцию опция входит, когда её контекст принят, — при
 * подключении элемента.
 */

import {
	SelectCollectionItemDescriptor,
	SelectItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import type { ISelectItem, TSelectItemCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding, TUpdateListener } from '../../../adapter'
import { createWebcElevator } from '../../../adapter/elevator'

export function setupSelectItem(
	host: HTMLElement,
	ctrl: ISelectItem | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<ISelectItem, TSelectItemCollectionFacade> {
	const adapter = createWebcAdapterContext(host, SelectItemDescriptor(), { ctrl, props })

	const itemAdapter = createWebcAdapterContext(
		host,
		SelectCollectionItemDescriptor(),
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
