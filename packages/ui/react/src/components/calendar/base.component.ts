import type { ICalendar } from '@soldy-ui/core'
import type { CalendarCollectionDescriptor, CalendarDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События Calendar — свои и фасада коллекции: колбэки обоих контекстов — пропсы компонента. */
export type CalendarEventProps = EventProps<typeof CalendarDescriptor> &
	EventProps<typeof CalendarCollectionDescriptor>

/** Пропсы Calendar; коллекционные входы (`engine`, `mode`) несёт `ICalendarProps`. */
export type CalendarProps = UseDomProps<typeof CalendarDescriptor, ICalendar, CalendarEventProps>
