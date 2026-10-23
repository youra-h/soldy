/**
 * `<div is="so-table">` — таблица: колонки и строки данными, сортировка,
 * выбор строк, ручка ширины, перестановка колонок, сетка и закреплённая шапка.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`), и это окно таблицы (`so-table__viewport`):
 * внешний узел компонента, вокруг корня `table`, который строит шаблон, —
 * элемент-обёртка (`wrapped` в описании корня). Класс и стиль потребителя и
 * скрытие — окну, как у Vue и React; классы, наборы ядра и привязка к
 * `TElementPlugin` — `table`, и тег ядру уходит её.
 *
 * Корень `table` — и поле окна (`control` в описании корня), как узел списка
 * у ListBox и Tabs: статические атрибуты разметки, кроме `class`, `style`,
 * `is`, `slot` и входов пропов, база при построении переносит на неё.
 * `aria-label` и `id` называют таблицу, а не окно без роли. Записанное из
 * кода позже остаётся на окне.
 *
 * Контекстов два — свой и фасада коллекции (`setupTable`), и пропсы фасада
 * (`items`, `columns`, `mode`, `engine`, `sort`, `grid`) — атрибуты-входы и
 * свойства того же элемента: дескриптор фасада элемент называет рядом со
 * своим. Колонки и строки — только данными (`columns` и `items` — массивы, и
 * атрибутом их пишут JSON), частей разметкой у таблицы нет: заголовки и
 * строки рисует она сама.
 *
 * Модуль регистрирует и части: заголовок колонки `<th is="so-table-column">` и
 * строку `<tr is="so-table-row">`.
 *
 * Разметка вынесена в table.template.ts, жизненный цикл — в ElementBase.
 */

import { TableCollectionDescriptor, TableDescriptor } from '@soldy-ui/setup'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementType } from '../../adapter'
import { TTableColumnElement } from './column'
import { TTableRowElement } from './row'
import { setupTable } from './setup.component'
import { tableTemplate } from './table.template'

export const TTableElement = ElementBase(HTMLDivElement, {
	descriptor: TableDescriptor,
	facade: TableCollectionDescriptor,
	template: tableTemplate,
	root: { strategy: 'wrapped' },
	setup: setupTable,
})

defineElement('so-table', TTableElement, 'div')
defineElement('so-table-column', TTableColumnElement, 'th')
defineElement('so-table-row', TTableRowElement, 'tr')

/**
 * `<div is="so-table">` из JS: нативный `div`, своё элемента soldy (`ctrl`,
 * `state` — вместе со свойствами фасада) и свойства пропов дескриптора вместе
 * с пропсами его плагинов и фасада (`items`, `columns`, `mode`, `engine`) —
 * без тех, что у `div` уже есть, и без `HOST_PROPS` (`TElementProps`).
 */
export type TTableElementProps = TElementType<typeof TTableElement>
