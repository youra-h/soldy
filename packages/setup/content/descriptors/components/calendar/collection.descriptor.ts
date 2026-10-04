/**
 * Дескрипторы коллекционной части Calendar — фасады владельца и дня.
 *
 * Членство в коллекции отделено от собственных пропсов компонента
 * (`CalendarDescriptor`, `CalendarItemDescriptor`): адаптер собирает
 * компонент из обоих рантайм-списков.
 *
 * Базы `CollectionDescriptor` здесь нет: её `items` и `trackBy` календарю не
 * положены. Состав дней кладёт вид по месяцам сеток, ключ сверки — дата, и
 * чужой `trackBy` сломал бы её. Движок снаружи (`engine`) — положен: его
 * держит тот, кто показывает календарь и зовёт команды его расширений, —
 * DatePicker, — а дни в нём кладёт тот же вид.
 */

import { defineComponent, defineDescriptor } from '../../../../protected/define'
import { TCalendarCollectionFacade, TCalendarItemCollectionFacade } from '@soldy-ui/core'

export const CalendarCollectionDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TCalendarCollectionFacade,

		/**
		 * Коллекционные props владельца Calendar — то, что выводит фасад
		 * `TCalendarCollectionFacade`: режим выбора, сетки и листание.
		 *
		 * `change:months` фасада не публикуется: показанные месяцы публикует
		 * владелец (`months`), и адаптер получил бы событие дважды.
		 */
		contribution: {
			props: {
				/**
				 * Готовая коллекция снаружи — аналог `ctrl` у компонента, как у
				 * остальных коллекций (`CollectionDescriptor`). Без триггеров: это
				 * вход, а не наблюдаемое значение. Собирает её `createEngineCalendar`;
				 * чего движку не хватает, фасад доустановит при привязке.
				 */
				engine: { type: Object },
				mode: { type: String, triggers: ['change:mode'] },
				/**
				 * Сетки показанных месяцев. `change:mode` — из-за
				 * `aria-multiselectable`: его сетке пишет режим выбора.
				 */
				grids: { type: Array, protected: true, triggers: ['change:grids', 'change:mode'] },
				/**
				 * Выключенность кнопок считает вид: «календарь выключен **или**
				 * сетки дошли до месяца границы» — одно правило, а не условие в
				 * шести разметках.
				 */
				prevDisabled: { type: Boolean, protected: true, triggers: ['change:paging'] },
				nextDisabled: { type: Boolean, protected: true, triggers: ['change:paging'] },
				/**
				 * Панели выбора месяца и года — по одной на сетку: поповер и
				 * список, которые разметка отдаёт компонентам, и снимок шапки и
				 * стрелок. Создаёт и ведёт их расширение `picker` коллекции.
				 */
				pickers: { type: Array, protected: true, triggers: ['change:pickers'] },
			},
		},
	}),
)

export const CalendarCollectionItemDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TCalendarItemCollectionFacade,

		/**
		 * Пропсов нет. Выбор и фокус дню пишут расширения коллекции прямо в его
		 * наборы, а `focused` фасада — фокус сетки — затёр бы `focused` дня:
		 * в разметке значения двух контекстов сливаются в один объект.
		 */
		contribution: {},
	}),
)
