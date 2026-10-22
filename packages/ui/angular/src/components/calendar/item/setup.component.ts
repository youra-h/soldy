import {
	CalendarCollectionItemDescriptor,
	CalendarItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import type { ICalendarItem, TCalendarItemCollectionFacade } from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding } from '../../../adapter'

/**
 * setupCalendarItem — setup-слой дня календаря.
 *
 * Два контекста, как у дня Vue и Svelte: собственный (`CalendarItemDescriptor`
 * — дата, номер, «недоступен») и фасада (`CalendarCollectionItemDescriptor`).
 * Расширение элемента берёт лифтом из слоя календаря движок и регистратор и
 * отдаёт фасаду контекст дня.
 *
 * Дни рисует календарь — по ячейкам сеток над элементами своей коллекции, — и
 * контекст фасада день принимает в `ngOnInit`, на сервере тоже: сервер рисует
 * день со всем, что пишут ему вид, выбор и фокус коллекции, — именем, выбором,
 * остановкой Tab. Своего у дня в разметке нет: выбирают его плагины календаря
 * по нажатию и клавишам на корне календаря.
 */
export function setupCalendarItem(
	ctrl: ICalendarItem | undefined,
	props: object,
): TBinding<ICalendarItem, TCalendarItemCollectionFacade> {
	const adapter = createAngularAdapterContext(CalendarItemDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter)

	const item = createAngularAdapterContext(
		CalendarCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(item))
}
