import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { ICalendarItem } from '@soldy-ui/core'
import { TCalendarItemSurface } from '../../../generated/calendar-item.metadata'
import { setupCalendarItem } from './setup.component'

/**
 * TCalendarItemComponent — день календаря (`Calendar.Item` у Vue и React).
 *
 * Обёртки нет: корень — сама ячейка сетки, `td`. Рисует его сам календарь —
 * по ячейке сетки над элементом своей коллекции (`[ctrl]`), — поэтому
 * селектор атрибутный: `<td so-calendar-item>` внутри строки недели, как
 * строка и заголовок колонки таблицы (`tr[so-table-row]`, `th[so-table-column]`):
 * чужой тег внутри `table` браузер выкинет. По APG (Date Picker Dialog) фокус
 * стоит на ячейке, и на ней же все три набора ядра: `aria` (имя — полная дата,
 * `aria-selected`, `aria-current`, `aria-disabled`, `tabindex` остановки Tab)
 * и `dataset` — отметки выбора, диапазона, «сегодня», «недоступен»,
 * «выключен». Раскладывает их `TComponentBase` (стратегия `'host'`). Кнопки
 * внутри ячейки нет: фокус на ней развёл бы ячейку и то, что фокусируют.
 *
 * Места в коллекции на корне нет (`order`): ячейки стоят в строках недель
 * таблицы, а не во флекс-ряду, и по месту их ставит сетка.
 *
 * Контекстов два — свой и фасада дня (`setupCalendarItem`): день входит в
 * коллекцию календаря, читая его слой лифта. Своего у дня в разметке нет:
 * нажатия и клавиши ловят плагины календаря на его корне.
 *
 * Содержимое дня — шаблон слота `default` со scope `{ text }` — номер дня в
 * цифрах локали; календарь отдаёт в него свой слот `item`, только заданный.
 * Без шаблона плитка рисует номер.
 *
 * `td[so-calendar-item]` стоит первым: по первому селектору Angular выбирает
 * тег хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра
 * по умолчанию.
 *
 * Selector: td[so-calendar-item], [so-calendar-item]
 */
@Component({
	selector: 'td[so-calendar-item], [so-calendar-item]',
	imports: [NgTemplateOutlet],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './calendar-item.component.html',
})
export class TCalendarItemComponent extends TCalendarItemSurface<ICalendarItem> {
	constructor() {
		super(setupCalendarItem, { strategy: 'host' })
	}
}
