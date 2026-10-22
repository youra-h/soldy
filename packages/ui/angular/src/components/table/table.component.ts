import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { ITable } from '@soldy-ui/core'
import { AttributesDirective, SlotDirective, provideElevator } from '../../adapter'
import { TCheckBoxComponent } from '../check-box'
import { TTableColumnComponent } from './column'
import { TTableRowComponent } from './row'
import { TTableSurface } from '../../generated/table.metadata'
import { setupTable } from './setup.component'

/**
 * Таблица: элемент потребителя — окно (`<div so-table>`), корень — `table` в шаблоне.
 * AGENTS.md (Angular), «Корень внутри обёртки — окно таблицы»,
 * «Таблица: части рисует она сама, ячейки — шаблон строки».
 */
@Component({
	selector: 'div[so-table], [so-table]',
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		SlotDirective,
		TCheckBoxComponent,
		TTableColumnComponent,
		TTableRowComponent,
	],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { class: 'so-table__viewport' },
	templateUrl: './table.component.html',
})
export class TTableComponent extends TTableSurface<ITable> {
	constructor() {
		super((ctrl, inputs) => setupTable(ctrl, inputs, this.engine), { strategy: 'wrapped' })
	}
}
