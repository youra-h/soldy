import {
	CalendarCollectionDescriptor,
	CalendarDescriptor,
	TCollectionExtension,
} from '@soldy-ui/setup'
import type { ICalendar, ICalendarProps, TCalendarCollectionFacade } from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { TBinding } from '../../adapter'

/** Calendar: лифт опускает движок и регистратор дней в слой календаря; `engine` — от DatePicker. */
export function setupCalendar(
	ctrl: ICalendar | undefined,
	props: object,
	engine: ICalendarProps['engine'],
): TBinding<ICalendar, TCalendarCollectionFacade> {
	const adapter = createAngularAdapterContext(CalendarDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter)

	const collectionAdapter = createAngularAdapterContext(
		CalendarCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine } },
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(collectionAdapter))
}
