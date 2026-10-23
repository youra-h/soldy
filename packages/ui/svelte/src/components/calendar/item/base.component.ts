import type { ICalendarItem } from '@soldy-ui/core'
import type { CalendarCollectionItemDescriptor, CalendarItemDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../../types'

export type CalendarItemEventProps = EventProps<typeof CalendarItemDescriptor> &
	EventProps<typeof CalendarCollectionItemDescriptor>

/** Входов у дня нет: дату и состояние пишут вид и расширения коллекции. */
export type CalendarItemProps = UseDomProps<
	typeof CalendarItemDescriptor,
	ICalendarItem,
	CalendarItemEventProps
>
