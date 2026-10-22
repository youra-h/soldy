import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { ITableColumn } from '@soldy-ui/core'
import {
	AttributesDirective,
	FieldTextDirective,
	RoleIconDirective,
	TextPipe,
} from '../../../adapter'
import { TButtonComponent } from '../../button'
import { TIconComponent } from '../../icon'
import { TTableColumnSurface } from '../../../generated/table-column.metadata'
import { setupTableColumn } from './setup.component'

/**
 * Заголовок колонки — ячейка шапки `th`, её рисует сама таблица по показанным колонкам.
 * Имя — ссылка на подпись: своё браузер собрал бы из всей ячейки, с ручкой и кнопкой.
 */
@Component({
	selector: 'th[so-table-column], [so-table-column]',
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		FieldTextDirective,
		RoleIconDirective,
		TextPipe,
		TButtonComponent,
		TIconComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './table-column.component.html',
})
export class TTableColumnComponent extends TTableColumnSurface<ITableColumn> {
	constructor() {
		super(setupTableColumn, { strategy: 'host', style: 'widthStyle' })
	}
}
