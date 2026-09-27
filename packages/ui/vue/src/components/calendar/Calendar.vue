<script lang="ts">
import { Button } from '../button'
import { Icon } from '../icon'
import { CalendarItem } from './item'
import SetupCalendar from './setup.component'

export default { ...SetupCalendar, components: { Button, Icon, CalendarItem } }
</script>

<template>
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		v-bind="{ ...attrs, ...aria, ...dataset }"
	>
		<!--
			Calendar — сетки показанных месяцев и одна пара кнопок листания на
			все. Корень рисуется по `tag`. Роли у корня нет: сетку по APG (Date
			Picker Dialog) несёт каждая таблица.

			Обработчиков в разметке нет: нажатия по дням и кнопкам и наведение
			ловит плагин указателя, клавиши — плагин клавиатуры, оба слушают
			корень и зовут команды коллекции. Связка «нажали ⇄ выбрали» иначе
			повторилась бы в каждом из шести адаптеров.

			Слота по умолчанию нет: дни кладёт в коллекцию вид календаря по
			месяцам сеток, и день из разметки попал бы в неё мимо вида.
		-->

		<!--
			Кнопки листания — одна пара на весь календарь: «назад» и «вперёд»
			двигают все сетки разом. В DOM пара стоит ДО сеток, поэтому Tab
			проходит «назад», «вперёд» и остановку сетки — одну на все сетки. На
			экране кнопки разносит тема: «назад» у начала ряда заголовков,
			«вперёд» у конца, вровень с крайними колонками. Порядок DOM от этого
			не меняется.

			Вида разметка кнопкам не передаёт: красит их тема по контексту
			(`:where(.s-calendar__prev)`), как кнопки ленты Scroller.
			Выключенность считает вид коллекции — «календарь выключен или сетки
			дошли до месяца границы». Значок — иконка роли `arrowRight` у обеих:
			своей роли «влево» в контракте иконок нет, стрелку «назад» зеркалит
			тема, в RTL — «вперёд».
		-->
		<Button
			embedded="calendar.prev"
			class="s-calendar__prev"
			:size="size"
			:disabled="prevDisabled"
			v-bind="prevAria"
		>
			<slot name="prev-icon">
				<Icon embedded="calendar.prev-icon" :tag="arrowIconTag" :size="size" />
			</slot>
		</Button>

		<!-- Кнопка «вперёд» — зеркальная пара «назад», см. комментарий выше. -->
		<Button
			embedded="calendar.next"
			class="s-calendar__next"
			:size="size"
			:disabled="nextDisabled"
			v-bind="nextAria"
		>
			<slot name="next-icon">
				<Icon embedded="calendar.next-icon" :tag="arrowIconTag" :size="size" />
			</slot>
		</Button>

		<!--
			Месяц — по одному на сетку (`grids`), ключ — первое число месяца:
			при листании оставшийся месяц переезжает целиком, и его дни не
			пересобираются. Месяцы стоят в ряд; высоту под шесть недель держит
			тема, и соседние сетки стоят вровень по строкам.
		-->
		<div v-for="grid in grids" :key="grid.key" class="s-calendar__month">
			<!--
				Заголовок месяца — текст `grid.title` и набор `grid.titleAria`: `id`,
				по которому сетку называет `aria-labelledby`, и `aria-live` — смену
				месяца скринридер объявляет сам. Не `h*`: уровень заголовка знает
				страница, а календарь стоит где угодно.
			-->
			<div class="s-calendar__title" v-bind="grid.titleAria">{{ grid.title }}</div>

			<!--
				Сетка — `table` с набором `grid.gridAria` (`role="grid"`, имя от
				заголовка, `aria-multiselectable`).
			-->
			<table class="s-calendar__grid" v-bind="grid.gridAria">
				<!--
					Дни недели — короткие имена из `weekdays`, по `th` на день.

					Строка скрыта от скринридера, и это отступление от APG, где у
					колонок есть заголовки: имя дня — полная дата, день недели в нём
					уже есть, и подписанная колонка прочла бы его второй раз. Поэтому
					и `abbr` у `th` не нужен.
				-->
				<thead aria-hidden="true">
					<tr class="s-calendar__weekdays">
						<th
							v-for="(weekday, index) in weekdays"
							:key="index"
							class="s-calendar__weekday"
						>
							{{ weekday.short }}
						</th>
					</tr>
				</thead>

				<tbody>
					<!--
						Неделя — семь ячеек, от первого дня недели; ключ — её
						первая дата.
					-->
					<tr v-for="week in grid.weeks" :key="week[0].date" class="s-calendar__week">
						<!--
							Ячейка — ключ по дате: день, оставшийся на экране при
							листании, не пересобирается и не теряет фокус.
						-->
						<template v-for="cell in week" :key="cell.date">
							<!--
								День — `Calendar.Item` над элементом коллекции
								`cell.item`. Содержимое дня — слот `item` со scope
								`{ item }` (цена, точка события); без него день рисует
								свой номер.
							-->
							<CalendarItem v-if="cell.item" :ctrl="cell.item">
								<template #default>
									<slot name="item" :item="cell.item" />
								</template>
							</CalendarItem>

							<!--
								Заполнитель — день соседнего месяца, у ячейки нет
								элемента. Это не день: ни числа, ни состояний, ни фокуса
								— число повторило бы дату, которая стоит в соседней
								сетке. Пустая ячейка держит место в неделе и получает
								набор ячейки (`cell.aria` — скрыта от скринридера).
							-->
							<td v-else class="s-calendar__filler" v-bind="cell.aria"></td>
						</template>
					</tr>
				</tbody>
			</table>
		</div>
	</component>
</template>
