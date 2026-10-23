import type { ICalendarItem } from '@soldy-ui/core'
import type { CalendarCollectionItemDescriptor, CalendarItemDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../../types'

/** События дня — свои (ядро и плагины) и фасада. */
export type CalendarItemEventProps = EventProps<typeof CalendarItemDescriptor> &
	EventProps<typeof CalendarCollectionItemDescriptor>

/** Пропсы дня: входов нет — только `ctrl` и слот; атрибуты потребителя — ячейке. */
export type CalendarItemProps = UseDomProps<
	typeof CalendarItemDescriptor,
	ICalendarItem,
	CalendarItemEventProps
>
