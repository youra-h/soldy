import type { ICalendar } from '@soldy-ui/core'
import type { CalendarCollectionDescriptor, CalendarDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События Calendar — свои и фасада коллекции. */
export type CalendarEventProps = EventProps<typeof CalendarDescriptor> &
	EventProps<typeof CalendarCollectionDescriptor>

/** Пропсы Calendar: коллекционные входы несёт интерфейс пропсов ядра (`ICalendarProps`). */
export type CalendarProps = UseDomProps<typeof CalendarDescriptor, ICalendar, CalendarEventProps>
