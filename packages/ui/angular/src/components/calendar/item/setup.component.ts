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

/** День календаря: свой контекст и фасада; выбирают его плагины календаря на корне. */
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
	).use(TCollectionItemExtension, {
		item: adapter.instance,
		member: adapter,
		elevator: AngularElevatorFactory,
	})

	return joinBindings(owner, useCollectionAdapter(item))
}
