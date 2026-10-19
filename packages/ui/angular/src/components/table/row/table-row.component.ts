import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { ITableRow, TTableRowCollectionFacade } from '@soldy-ui/core'
import { AttributesDirective, type TBinding } from '../../../adapter'
import { TCheckBoxComponent } from '../../check-box'
import { TableRowInputNames, TTableRowSurface } from './base.component'
import { setupTableRow } from './setup.component'

/**
 * TTableRowComponent — строка таблицы (`Table.Row` у Vue и React).
 *
 * Обёртки нет: корень — сам элемент, `tr`. Рисует его сама таблица — по
 * записи `drawn` над элементом своей коллекции (`[ctrl]`), — поэтому селектор
 * атрибутный: `<tr so-table-row>` внутри `tbody`. На корне модификаторы
 * размера и варианта (их строке диктует таблица) и набор `dataset`:
 * `data-selected` (пишет выбор коллекции — всем строкам) и `data-disabled`, а
 * в сетке — `aria-selected`. Классы, наборы и скрытие раскладывает
 * `TComponentBase` (стратегия `'host'`). Нажатие по строке ловит плагин сетки
 * таблицы: в сетке оно выбирает строку, в роли `table` не делает ничего —
 * выбирают чекбоксом.
 *
 * Контекстов два — свой и фасада строки (`setupTableRow`): строка входит в
 * коллекцию таблицы, читая её слой лифта, а фасад отдаёт ячейки, имя строки,
 * выбор строк и набор ячеек сетки.
 *
 * Своей единицы перерисовки у ячеек, как `_TableRowCells` у Vue, нет:
 * компонент Angular — всегда элемент, а лишний узел в `tr` ломает таблицу.
 * Ячейки — в шаблоне строки, петлёй по колонке ячейки: выбор перерисовывает
 * строку, но ни ячеек, ни содержимого шаблона `cell` не пересоздаёт (см.
 * шаблон).
 *
 * `tr[so-table-row]` стоит первым: по первому селектору Angular выбирает тег
 * хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра по
 * умолчанию.
 *
 * Selector: tr[so-table-row], [so-table-row]
 */
@Component({
	selector: 'tr[so-table-row], [so-table-row]',
	standalone: true,
	imports: [NgTemplateOutlet, AttributesDirective, TCheckBoxComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './table-row.component.html',
})
export class TTableRowComponent extends TTableRowSurface<ITableRow> {
	constructor() {
		super(TableRowInputNames, { strategy: 'host' })
	}

	protected createBinding(
		ctrl: ITableRow | undefined,
		inputs: object,
	): TBinding<ITableRow, TTableRowCollectionFacade> {
		return setupTableRow(ctrl, inputs)
	}
}
