import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { ITableColumn } from '@soldy-ui/core'
import {
	AttributesDirective,
	FieldTextDirective,
	RoleIconDirective,
	TextPipe,
	type TBinding,
} from '../../../adapter'
import { TButtonComponent } from '../../button'
import { TIconComponent } from '../../icon'
import { TableColumnInputNames, TTableColumnSurface } from './base.component'
import { setupTableColumn } from './setup.component'

/**
 * TTableColumnComponent — заголовок колонки таблицы (`Table.Column` у Vue и
 * React).
 *
 * Обёртки нет: корень — сам элемент, ячейка шапки `th`, как у Button. Рисует
 * его сама таблица — по показанным колонкам, над экземпляром колонки
 * (`[ctrl]`), — поэтому селектор атрибутный: `<th so-table-column>` внутри
 * `tr`, а элементный селектор дал бы ячейке шапки не тот тег. Тег ядро берёт у
 * элемента (`th`), и колонка пишет `scope="col"` в свои `attrs`, пока он `th`.
 *
 * На корне — наборы колонки: `aria-sort` (только у первой по приоритету),
 * `data-sort`, `data-sort-priority`, `data-align`, `data-sized`,
 * `data-resizing`, — и ширина переменной `--so-table-column-width`: её считает
 * ядро (`widthStyle`), и база кладёт её в стиль корня стиль-выходом
 * компонента (описание корня, `style`). Классы, наборы, стиль и скрытие
 * раскладывает `TComponentBase` (стратегия `'host'`). Обработчиков на ячейке
 * нет: протяжку ловит плагин ручки на корне, клавиши и жест скринридера — он
 * же на поле. Нажатие по ячейке не сортирует.
 *
 * Имя заголовка — ссылка на подпись (`aria-labelledby` в `aria`): своё имя
 * браузер собрал бы из всей ячейки, а в ней и значение поля ручки («Имя 150»),
 * и имя кнопки сортировки. Ссылку и `id` подписи пишет плагин связок.
 *
 * Содержимое — ряд, как у Vue: подпись, а у сортируемой колонки за ней кнопка
 * сортировки. Подпись — у всех колонок: шаблон `default` (scope
 * `{ text, sortable }`), без него — проекция, а без неё — текст колонки;
 * таблица отдаёт в шаблон свой слот `header`. Кнопка — `Button`
 * (`embedded: 'table.sort'`), только у `sortable`: нажатие — просьба колонки
 * (`toggleSort`), сортирует расширение коллекции строк. Есть кнопка, только
 * пока колонка сортируемая (`@if`, а не `rendered` кнопки: у Angular он прячет
 * корень, а не удаляет). Ручка ширины — поле `range` в полосе у края заголовка,
 * пока она есть (`resizerRendered`).
 *
 * Шаблоны слотов уходят в слив в конце шаблона: в основной проекции они сняли
 * бы запасной текст.
 *
 * `th[so-table-column]` стоит первым: по первому селектору Angular выбирает
 * тег хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра
 * по умолчанию.
 *
 * Selector: th[so-table-column], [so-table-column]
 */
@Component({
	selector: 'th[so-table-column], [so-table-column]',
	standalone: true,
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
		super(TableColumnInputNames, { strategy: 'host', style: 'widthStyle' })
	}

	protected createBinding(
		ctrl: ITableColumn | undefined,
		inputs: object,
	): TBinding<ITableColumn> {
		return setupTableColumn(ctrl, inputs)
	}

	/**
	 * Нажатие кнопки сортировки — просьба колонки (`sort:request`): сортирует
	 * расширение коллекции строк по своим правилам.
	 */
	protected toggleSort(): void {
		this.instance()?.toggleSort()
	}
}
