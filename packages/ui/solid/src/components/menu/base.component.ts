import type { IMenu } from '@soldy-ui/core'
import type { MenuCollectionDescriptor, MenuDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/**
 * События Menu — свои (ядро и плагины) и фасада коллекции: состав, группы,
 * подменю из данных и `choose` — нажатие пункта-действия. Контекстов у меню
 * два, и колбэки обоих — пропсы одного компонента.
 */
export type MenuEventProps = EventProps<typeof MenuDescriptor> &
	EventProps<typeof MenuCollectionDescriptor>

/**
 * Пропсы Menu. Атрибуты потребителя — корня, обёртки триггера, как у Popover:
 * ARIA меню — у панели, а связку с ней триггер берёт из scope слота
 * `trigger`. Коллекционные входы (`engine`, `items`, `trackBy`, группы)
 * отдельно не перечислены: они входят в интерфейс пропсов ядра
 * (`IMenuProps`), и тип их несёт дескриптор меню.
 */
export type MenuProps = UseDomProps<typeof MenuDescriptor, IMenu, MenuEventProps>
