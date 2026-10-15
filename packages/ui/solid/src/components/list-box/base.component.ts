import type { IListBox } from '@soldy-ui/core'
import type { ListBoxCollectionDescriptor, ListBoxDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/**
 * События ListBox — свои (ядро и плагины) и фасада коллекции: режим и выбор,
 * состав, `engine:create`. Контекстов у списка два, и колбэки обоих — пропсы
 * одного компонента.
 */
export type ListBoxEventProps = EventProps<typeof ListBoxDescriptor> &
	EventProps<typeof ListBoxCollectionDescriptor>

/**
 * Пропсы ListBox. Коллекционные входы (`engine`, `items`, `mode`, `trackBy`)
 * отдельно не перечислены: они входят в интерфейс пропсов ядра
 * (`IListBoxProps`), и тип их несёт дескриптор компонента.
 */
export type ListBoxProps = UseDomProps<typeof ListBoxDescriptor, IListBox, ListBoxEventProps>
