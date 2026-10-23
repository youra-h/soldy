/**
 * `<tr is="so-table-row">` — строка таблицы (`Table.Row`): рисует таблица над
 * элементом коллекции строк, вход — только `selected` фасада; регистрирует
 * модуль таблицы. docs/architecture.md, Layer 8d, «Коллекция».
 */

import { TableCollectionRowDescriptor, TableRowDescriptor } from '@soldy-ui/setup'
import type { ITableRow, TTableRowCollectionFacade } from '@soldy-ui/core'
import { ElementBase } from '../../../adapter'
import type { TElementClassOf, TElementType } from '../../../adapter'
import { setupTableRow } from './setup.component'
import { tableRowTemplate } from './table-row.template'

export const TTableRowElement: TElementClassOf<
	typeof HTMLTableRowElement,
	typeof TableRowDescriptor,
	ITableRow,
	TTableRowCollectionFacade
> = ElementBase(HTMLTableRowElement, {
	descriptor: TableRowDescriptor,
	facade: TableCollectionRowDescriptor,
	template: tableRowTemplate,
	setup: setupTableRow,
})

export type TTableRowElementProps = TElementType<typeof TTableRowElement>
