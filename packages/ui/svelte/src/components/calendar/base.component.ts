import type { ICalendar } from '@soldy-ui/core'
import type { CalendarCollectionDescriptor, CalendarDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

export type CalendarEventProps = EventProps<typeof CalendarDescriptor> &
	EventProps<typeof CalendarCollectionDescriptor>

export type CalendarProps = UseDomProps<typeof CalendarDescriptor, ICalendar, CalendarEventProps>
