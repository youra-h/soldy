/**
 * `<tr is="so-table-row">` — строка таблицы (`Table.Row`).
 *
 * Элемент — настоящий `<tr>`, расширенный классом soldy (customized built-in,
 * см. `ElementBase`): тег ядра по умолчанию. Рисует его таблица — по строке
 * на запись того, что рисует коллекция строк (`drawn`), над элементом
 * коллекции (`ctrl`), — а не потребитель: строки задаются только данными
 * (`items`, `engine`). Входов у строки нет, кроме `selected` фасада: запись,
 * «выключена», размер и вариант кладут в неё данные и таблица.
 *
 * Контекстов два — свой и фасада строки (`setupTableRow`), и пропсы фасада —
 * свойства того же элемента: дескриптор фасада элемент называет рядом со
 * своим. В коллекцию строка входит, когда собирается: движок таблицы она
 * находит лифтом вверх по документу.
 *
 * Регистрирует элемент модуль таблицы (`Table.element.ts`), после неё.
 *
 * Разметка вынесена в table-row.template.ts, жизненный цикл — в ElementBase.
 */

import { TableCollectionRowDescriptor, TableRowDescriptor } from '@soldy-ui/setup'
import { ElementBase } from '../../../adapter'
import type { TElementType } from '../../../adapter'
import { setupTableRow } from './setup.component'
import { tableRowTemplate } from './table-row.template'

export const TTableRowElement = ElementBase(HTMLTableRowElement, {
	descriptor: TableRowDescriptor,
	facade: TableCollectionRowDescriptor,
	template: tableRowTemplate,
	setup: setupTableRow,
})

/**
 * `<tr is="so-table-row">` из JS: нативный `tr`, своё элемента soldy (`ctrl` —
 * строка, `state` — вместе со свойствами фасада) и свойства пропов
 * дескриптора вместе с пропсами фасада (`selected`) — без тех, что у `tr` уже
 * есть, и без `HOST_PROPS` (`TElementProps`).
 */
export type TTableRowElementProps = TElementType<typeof TTableRowElement>
