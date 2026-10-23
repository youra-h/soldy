/**
 * `<div is="so-table">` — окно таблицы вокруг корня `table` (`wrapped`): окну —
 * класс, стиль и скрытие, остальное — `table`. Колонки и строки — только
 * данными; модуль регистрирует и части. docs/architecture.md, Layer 8d,
 * «Коллекция»; AGENTS.md (Web Components), «Корень».
 */

import { TableCollectionDescriptor, TableDescriptor } from '@soldy-ui/setup'
import type { ITable, TTableCollectionFacade } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementClassOf, TElementType } from '../../adapter'
import { TTableColumnElement } from './column'
import { TTableRowElement } from './row'
import { setupTable } from './setup.component'
import { tableTemplate } from './table.template'

export const TTableElement: TElementClassOf<
	typeof HTMLDivElement,
	typeof TableDescriptor,
	ITable,
	TTableCollectionFacade
> = ElementBase(HTMLDivElement, {
	descriptor: TableDescriptor,
	facade: TableCollectionDescriptor,
	template: tableTemplate,
	root: { strategy: 'wrapped' },
	setup: setupTable,
})

defineElement('so-table', TTableElement, 'div')
defineElement('so-table-column', TTableColumnElement, 'th')
defineElement('so-table-row', TTableRowElement, 'tr')

export type TTableElementProps = TElementType<typeof TTableElement>
