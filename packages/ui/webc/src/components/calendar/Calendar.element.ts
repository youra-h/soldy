/**
 * `<div is="so-calendar">` — календарь: сетки показанных месяцев, одна пара
 * кнопок листания на все и подвал, если его передали.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`): тег ядра по умолчанию. На корне — все три
 * набора ядра, как у Vue: роли у корня нет, сетку несёт каждая таблица, а
 * атрибуты разметки потребителя остаются на корне — поля под них нет.
 *
 * Контекстов два — свой и фасада коллекции (`setupCalendar`), и пропсы фасада
 * (`mode`, `engine`) — атрибуты-входы и свойства того же элемента: дескриптор
 * фасада элемент называет рядом со своим. Дни кладёт в коллекцию вид календаря
 * по месяцам сеток, а рисует шаблон, поэтому слота по умолчанию у календаря
 * нет. Движок его сборка опускает лифтом своему хосту, и дни, которые рисует
 * шаблон, находят его вверх по документу.
 *
 * Модуль регистрирует и день — `<td is="so-calendar-item">`. Заголовок месяца
 * — Popover на `div` (`<div is="so-popover-div">`) — регистрирует фабрика
 * поповера там, где он впервые нужен, — модуль шаблона календаря.
 *
 * Разметка вынесена в calendar.template.ts, жизненный цикл — в ElementBase.
 */

import { CalendarCollectionDescriptor, CalendarDescriptor } from '@soldy-ui/setup'
import type { ICalendar, TCalendarCollectionFacade } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { IElementBase, TElementProps } from '../../adapter'
import { calendarTemplate } from './calendar.template'
import { TCalendarItemElement } from './item'
import { setupCalendar } from './setup.component'

export const TCalendarElement = ElementBase(HTMLDivElement, {
	descriptor: CalendarDescriptor(),
	facade: CalendarCollectionDescriptor(),
	template: calendarTemplate,
	setup: setupCalendar,
})

defineElement('so-calendar', TCalendarElement, 'div')
defineElement('so-calendar-item', TCalendarItemElement, 'td')

/**
 * `<div is="so-calendar">` из JS: нативный `div`, своё элемента soldy (`ctrl`,
 * `state` — вместе со свойствами фасада) и свойства пропов дескриптора вместе
 * с пропсами его плагинов и фасада (`months`, `mode`, `engine`) — без тех, что
 * у `div` уже есть, и без `HOST_PROPS` (`TElementProps`).
 */
export type TCalendarElementProps = HTMLDivElement &
	IElementBase<ICalendar, TCalendarCollectionFacade> &
	TElementProps<typeof CalendarDescriptor, HTMLDivElement>
