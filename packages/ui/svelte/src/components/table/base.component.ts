import type { ITable } from '@soldy-ui/core'
import type { TableCollectionDescriptor, TableDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/**
 * События Table — свои (ядро и плагины) и фасада коллекции: выбор и состав
 * строк, сортировка, ширина и место колонки, которые задал пользователь
 * (`onColumnResize`, `onColumnMove`), `engine:create`. Контекстов у таблицы
 * два, и колбэки обоих — пропсы одного компонента.
 */
export type TableEventProps = EventProps<typeof TableDescriptor> &
	EventProps<typeof TableCollectionDescriptor>

/**
 * Пропсы Table. Коллекционные входы (`engine`, `items`, `columns`, `mode`,
 * `sort`, `grid`, …) отдельно не перечислены: они входят в интерфейс пропсов
 * ядра (`ITableProps`), и тип их несёт дескриптор компонента. Атрибуты DOM
 * делятся: класс, стиль и `ref` — окну таблицы, внешнему узлу компонента,
 * остальное и attachment-ы потребителя — `table`, где её роль и имя.
 */
export type TableProps = UseDomProps<typeof TableDescriptor, ITable, TableEventProps>
