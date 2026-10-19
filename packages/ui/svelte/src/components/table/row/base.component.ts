import type { ITableRow } from '@soldy-ui/core'
import type { TableCollectionRowDescriptor, TableRowDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../../types'

/** События строки — свои (ядро и плагины) и фасада: выбор, ячейки, выбор строк. */
export type TableRowEventProps = EventProps<typeof TableRowDescriptor> &
	EventProps<typeof TableCollectionRowDescriptor>

/**
 * Пропсы строки. Входов у строки нет: запись, «выключена», размер и вариант
 * кладут в неё данные и таблица, а рисует строку таблица над её экземпляром
 * (`ctrl`). Членство в коллекции (`selected`) входит в интерфейс пропсов ядра,
 * и тип его несёт дескриптор строки.
 */
export type TableRowProps = UseDomProps<typeof TableRowDescriptor, ITableRow, TableRowEventProps>
