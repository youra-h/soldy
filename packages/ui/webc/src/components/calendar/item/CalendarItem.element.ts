/**
 * `<td is="so-calendar-item">` — день календаря, `Calendar.Item`: сама ячейка
 * сетки, внутри — плитка дня.
 *
 * Элемент — настоящий `<td>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`): тег ядра по умолчанию. По APG (Date Picker
 * Dialog) фокус стоит на ячейке, и на ней же все три набора ядра — `attrs`,
 * `aria` (имя — полная дата, `aria-selected`, `aria-current`,
 * `aria-disabled`, остановка Tab) и `dataset` (отметки выбора, «сегодня»,
 * «недоступен», «выключен»). Поля в корне нет: кнопки внутри ячейки нет, фокус
 * на ней развёл бы ячейку и то, что фокусируют.
 *
 * Дни кладёт в коллекцию вид календаря по месяцам сеток, а рисует их шаблон
 * календаря, по одному на день показанного месяца: потребитель дни в разметку
 * не ставит, — `td` вне таблицы парсер HTML и не пустил бы. День — разметка
 * календаря (`createItem`), и его события не всплывают: их слышно на самом
 * дне, а выбор календарь сообщает `so:change:value`. Пропсы фасада — у дня
 * их нет: выбор и фокус ему пишут расширения коллекции прямо в наборы.
 * Регистрирует элемент модуль календаря (`Calendar.element.ts`).
 *
 * Разметка вынесена в calendar-item.template.ts, жизненный цикл — в
 * ElementBase.
 */

import { CalendarCollectionItemDescriptor, CalendarItemDescriptor } from '@soldy-ui/setup'
import type { ICalendarItem, TCalendarItemCollectionFacade } from '@soldy-ui/core'
import { ElementBase } from '../../../adapter'
import type { TElementType } from '../../../adapter'
import { calendarItemTemplate } from './calendar-item.template'
import { setupCalendarItem } from './setup.component'

export const TCalendarItemElement = ElementBase(HTMLTableCellElement, {
	descriptor: CalendarItemDescriptor,
	facade: CalendarCollectionItemDescriptor,
	template: calendarItemTemplate,
	setup: setupCalendarItem,
})

/**
 * `<td is="so-calendar-item">` из JS: нативный `td`, своё элемента soldy
 * (`ctrl`, `state` — вместе со свойствами фасада) и свойства пропов
 * дескриптора — без тех, что у `td` уже есть, и без `HOST_PROPS`
 * (`TElementProps`). Входов у дня нет: всё ему пишут вид и расширения
 * коллекции календаря.
 */
export type TCalendarItemElementProps = TElementType<typeof TCalendarItemElement>
