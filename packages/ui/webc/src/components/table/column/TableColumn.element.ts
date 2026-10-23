/**
 * `<th is="so-table-column">` — заголовок колонки (`Table.Column`): рисует
 * таблица над экземпляром колонки, входов нет; регистрирует модуль таблицы.
 * Ширина — `--so-table-column-width` из `widthStyle`, по ней тема режет колонку.
 */

import { TableColumnDescriptor } from '@soldy-ui/setup'
import type { ITableColumn } from '@soldy-ui/core'
import { ElementBase } from '../../../adapter'
import type { TElementClassOf, TElementType } from '../../../adapter'
import { setupTableColumn } from './setup.component'
import { tableColumnTemplate } from './table-column.template'

export const TTableColumnElement: TElementClassOf<
	typeof HTMLTableCellElement,
	typeof TableColumnDescriptor,
	ITableColumn
> = ElementBase(HTMLTableCellElement, {
	descriptor: TableColumnDescriptor,
	template: tableColumnTemplate,
	root: { strategy: 'host', style: 'widthStyle' },
	setup: setupTableColumn,
})

export type TTableColumnElementProps = TElementType<typeof TTableColumnElement>
