import type { ITabs } from '@soldy-ui/core'
import type { TabsCollectionDescriptor, TabsDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/**
 * События Tabs — свои (ядро и плагины) и фасада коллекции: активация,
 * закрытие, состав, `engine:create`. Контекстов у набора два, и колбэки обоих
 * — пропсы одного компонента.
 */
export type TabsEventProps = EventProps<typeof TabsDescriptor> &
	EventProps<typeof TabsCollectionDescriptor>

/**
 * Пропсы Tabs. Коллекционные входы (`engine`, `items`, `trackBy`) отдельно не
 * перечислены: они входят в интерфейс пропсов ядра (`ITabsProps`), и тип их
 * несёт дескриптор компонента.
 */
export type TabsProps = UseDomProps<typeof TabsDescriptor, ITabs, TabsEventProps>
