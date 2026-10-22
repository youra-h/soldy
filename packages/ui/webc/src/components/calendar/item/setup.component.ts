/**
 * setupCalendarItem — setup-слой дня календаря.
 *
 * Два контекста, как у дня Vue: собственный (`CalendarItemDescriptor` — дата,
 * номер, «недоступен») и фасада (`CalendarCollectionItemDescriptor` — членство
 * в коллекции календаря), одной связкой. Расширение элемента берёт лифтом
 * движок и регистратор календаря — ближайшего выше по документу — и отдаёт
 * фасаду контекст дня: по нему плагины календаря находят узел дня. Порядок
 * связок — как у Vue: фасад первым, и в коллекцию день входит, когда его
 * контекст принят, — при подключении элемента.
 *
 * Логики здесь нет: дату, номер и наборы дню пишут вид и расширения
 * коллекции, а выбирают его плагины календаря по нажатию и клавишам на корне
 * календаря.
 */

import {
	CalendarCollectionItemDescriptor,
	CalendarItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import type { ICalendarItem, TCalendarItemCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding, TUpdateListener } from '../../../adapter'
import { createWebcElevator } from '../../../adapter/elevator'

export function setupCalendarItem(
	host: HTMLElement,
	ctrl: ICalendarItem | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<ICalendarItem, TCalendarItemCollectionFacade> {
	const adapter = createWebcAdapterContext(host, CalendarItemDescriptor(), { ctrl, props })

	const itemAdapter = createWebcAdapterContext(
		host,
		CalendarCollectionItemDescriptor(),
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
