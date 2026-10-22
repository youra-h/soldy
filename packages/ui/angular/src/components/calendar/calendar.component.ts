import { Component, ChangeDetectionStrategy } from '@angular/core'
import { NgTemplateOutlet } from '@angular/common'
import type { ICalendar, TCalendarCollectionFacade } from '@soldy-ui/core'
import {
	AttributesDirective,
	RoleIconDirective,
	SlotDirective,
	provideElevator,
	type TBinding,
} from '../../adapter'
import { TButtonComponent } from '../button'
import { TIconComponent } from '../icon'
import { TListBoxComponent } from '../list-box'
import { TPopoverComponent } from '../popover'
import { TCalendarItemComponent } from './item'
import { CalendarInputNames, TCalendarSurface } from './base.component'
import { setupCalendar } from './setup.component'

/**
 * TCalendarComponent — сетки показанных месяцев, одна пара кнопок листания на
 * все и подвал, если его передали, как у Vue.
 *
 * Селектор атрибутный, как у Button: `<div so-calendar>`. Корень — сам
 * элемент потребителя, и всё, что потребитель на нём написал, остаётся на нём:
 * на корне все три набора ядра (`data-disabled` — в `dataset`), их
 * раскладывает `TComponentBase` (стратегия `'host'`). Роли у корня нет: сетку
 * по APG (Date Picker Dialog) несёт каждая таблица.
 *
 * Сетка месяца — `table` с днями-`td`: день — `<td so-calendar-item>`,
 * атрибутом на ячейке, как строка и заголовок колонки таблицы, — чужой тег
 * внутри `table` браузер выкинет. Заголовок месяца — кнопка-триггер поповера
 * места (`<div so-popover>` над экземплярами расширения `picker`), в панели —
 * ListBox месяцев или лет и шапка. Кнопки листания — одна пара, у первого
 * месяца.
 *
 * Контекстов два — свой и фасада коллекции (`setupCalendar`), и входы фасада
 * (`engine`, `mode`) — входы того же элемента. Свой слой лифта календарь отдаёт
 * поддереву провайдером (`provideElevator()`): дни в его шаблоне прочтут из
 * слоя движок и регистратор этого календаря, а списки панелей выбора — свои.
 *
 * Слоты — шаблоны: `item` (`let-item`, `let-text`) — содержимое дня,
 * `prev-icon` и `next-icon` — значки кнопок листания, `footer` — подвал.
 * Основной проекции нет: дни кладёт в коллекцию вид по месяцам сеток.
 *
 * Логики здесь нет: состав дней, выбор, фокус, листание и панели выбора ведут
 * расширения коллекции, клавиши и нажатия — плагины календаря на корне (см.
 * `setupCalendar`).
 *
 * `div[so-calendar]` стоит первым: по первому селектору Angular выбирает тег
 * хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра по
 * умолчанию.
 *
 * Selector: div[so-calendar], [so-calendar]
 */
@Component({
	selector: 'div[so-calendar], [so-calendar]',
	standalone: true,
	imports: [
		NgTemplateOutlet,
		AttributesDirective,
		RoleIconDirective,
		SlotDirective,
		TButtonComponent,
		TIconComponent,
		TListBoxComponent,
		TPopoverComponent,
		TCalendarItemComponent,
	],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './calendar.component.html',
})
export class TCalendarComponent extends TCalendarSurface<ICalendar> {
	constructor() {
		super(CalendarInputNames, { strategy: 'host' })
	}

	protected createBinding(
		ctrl: ICalendar | undefined,
		inputs: object,
	): TBinding<ICalendar, TCalendarCollectionFacade> {
		return setupCalendar(ctrl, inputs, this.engine)
	}
}
