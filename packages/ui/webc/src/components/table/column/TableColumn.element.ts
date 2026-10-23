/**
 * `<th is="so-table-column">` — заголовок колонки таблицы (`Table.Column`).
 *
 * Элемент — настоящий `<th>`, расширенный классом soldy (customized built-in,
 * см. `ElementBase`): тег ядра по умолчанию. Рисует его таблица — по
 * заголовку на показанную колонку, над её экземпляром (`ctrl`), — а не
 * потребитель: колонки задаются только данными (`columns`). Входов у части
 * нет: всё своё у колонки защищено и только читается.
 *
 * На корне — классы, наборы колонки и ширина переменной
 * `--so-table-column-width`: стиль-выход колонки (`widthStyle`, считает ядро),
 * его база кладёт поверх выхода плагина раскладки. По ней тема режет колонку.
 *
 * Регистрирует элемент модуль таблицы (`Table.element.ts`), после неё.
 *
 * Разметка вынесена в table-column.template.ts, жизненный цикл — в ElementBase.
 */

import { TableColumnDescriptor } from '@soldy-ui/setup'
import type { ITableColumn } from '@soldy-ui/core'
import { ElementBase } from '../../../adapter'
import type { IElementBase, TElementProps } from '../../../adapter'
import { setupTableColumn } from './setup.component'
import { tableColumnTemplate } from './table-column.template'

export const TTableColumnElement = ElementBase(HTMLTableCellElement, {
	descriptor: TableColumnDescriptor(),
	template: tableColumnTemplate,
	root: { style: 'widthStyle' },
	setup: setupTableColumn,
})

/**
 * `<th is="so-table-column">` из JS: нативный `th`, своё элемента soldy
 * (`ctrl` — колонка, `state`) и свойства пропов дескриптора — без тех, что у
 * `th` уже есть, и без `HOST_PROPS` (`TElementProps`).
 */
export type TTableColumnElementProps = HTMLTableCellElement &
	IElementBase<ITableColumn> &
	TElementProps<typeof TableColumnDescriptor, HTMLTableCellElement>
