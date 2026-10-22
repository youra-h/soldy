import type { ICalendar } from '@soldy-ui/core'
import type { CalendarCollectionDescriptor, CalendarDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/**
 * События Calendar — свои (ядро и плагины) и фасада коллекции: режим выбора,
 * сетки, листание, панели выбора месяца и года, `engine:create`. Контекстов у
 * календаря два, и колбэки обоих — пропсы одного компонента.
 */
export type CalendarEventProps = EventProps<typeof CalendarDescriptor> &
	EventProps<typeof CalendarCollectionDescriptor>

/**
 * Пропсы Calendar. Коллекционные входы (`engine`, `mode`) отдельно не
 * перечислены: они входят в интерфейс пропсов ядра (`ICalendarProps`), и тип
 * их несёт дескриптор компонента. Атрибуты потребителя — корню, как у Vue.
 */
export type CalendarProps = UseDomProps<typeof CalendarDescriptor, ICalendar, CalendarEventProps>
