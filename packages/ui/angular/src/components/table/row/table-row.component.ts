import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { ITableRow } from '@soldy-ui/core'
import { AttributesDirective, RunsPipe } from '../../../adapter'
import { TCheckBoxComponent } from '../../check-box'
import { TTableRowSurface } from '../../../generated/table-row.metadata'
import { setupTableRow } from './setup.component'

/**
 * Строка таблицы — `tr`, её рисует сама таблица по записи `drawn`; ячейки — в её шаблоне.
 * AGENTS.md (Angular), «Таблица: части рисует она сама, ячейки — шаблон строки».
 */
@Component({
	selector: 'tr[so-table-row], [so-table-row]',
	imports: [NgTemplateOutlet, AttributesDirective, RunsPipe, TCheckBoxComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './table-row.component.html',
})
export class TTableRowComponent extends TTableRowSurface<ITableRow> {
	constructor() {
		super(setupTableRow, { strategy: 'host' })
	}
}
