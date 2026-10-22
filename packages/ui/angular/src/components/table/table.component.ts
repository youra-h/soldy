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
 * TTableComponent — таблица по паттернам APG Table и Sortable Table, как у
 * Vue. Роль `table` даёт тег, своей клавиатуры у таблицы нет. В режиме сетки
 * (`grid`, APG Data Grid) роль `grid`, `aria-multiselectable` и остановку Tab
 * таблице пишет коллекция в её `aria`, а клавиши и фокус ячеек ведёт плагин
 * сетки на корне. Имя таблице — `aria_label` или `aria_labelledBy`.
 *
 * Элемент потребителя — окно таблицы (`<div so-table>`, как
 * `<div is="so-table">` у Web Components), а корень — `table` в шаблоне:
 * корень внутри обёртки, стратегия `'wrapped'` у `TComponentBase`, как
 * `div.so-table__viewport` вокруг `table` у Vue и React. В окне таблица
 * прокручивается вбок, когда колонки шире места: прокрутку включает тема по
 * `data-overflow` таблицы, а ширину окна мерит плагин раскладки — он ищет окно
 * родителем корня. Окно — внешний узел компонента: класс и стиль потребителя
 * стоят на нём, и его же прячут `visible` и `rendered`; свой класс окна —
 * статикой хоста. Классы, наборы и стиль ядра база кладёт на `table`, и
 * `TElementPlugin` получает её — плагины и тема видят корнем таблицу.
 *
 * Атрибуты потребителя делятся, как у поля: всё, что потребитель записал на
 * таблицу, кроме `class` и `style`, доходит до `table` (`#root`) — статику
 * переносит база, привязки и слушатели — рендерер адаптера (`provideAttrs()`):
 * `aria-label` и `id` называют таблицу, а не окно без роли.
 *
 * Контекстов два — свой и фасада коллекции строк (`setupTable`), и входы
 * фасада (`items`, `columns`, `mode`, `engine`, `sort`, `grid`, …) — входы
 * того же элемента. Свой слой лифта таблица отдаёт поддереву провайдером
 * (`provideElevator()`): строки из её шаблона прочтут из слоя движок и
 * регистратор этой таблицы.
 *
 * Колонки и строки задаются только данными (`columns`, `items`): заголовок
 * колонки (`th[so-table-column]`) и строку (`tr[so-table-row]`) рисует сама
 * таблица, поэтому основной проекции у неё нет. Слоты: `header` (scope
 * `{ column, text, sortable }`) и `cell` (scope `{ row, column, value }`) —
 * шаблонами (`<ng-template slot="cell" let-row="row" …>`), `empty` —
 * проекцией (`<p slot="empty">`).
 *
 * `div[so-table]` стоит первым: по первому селектору Angular выбирает тег
 * хоста, когда создаёт компонент сам (`createComponent`), — окно, как у
 * остальных адаптеров, это `div`.
 *
 * Selector: div[so-table], [so-table]
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
