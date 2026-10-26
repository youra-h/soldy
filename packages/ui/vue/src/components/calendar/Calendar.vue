<script lang="ts">
import { Button } from '../button'
import { Icon } from '../icon'
import { ListBox } from '../list-box'
import { Popover } from '../popover'
import { CalendarItem } from './item'
import SetupCalendar from './setup.component'

export default { ...SetupCalendar, components: { Button, Icon, ListBox, Popover, CalendarItem } }
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
			Calendar — сетки показанных месяцев, одна пара кнопок листания на
			все и подвал, если его передали. Корень рисуется по `tag`. Роли у
			корня нет: сетку по APG (Date Picker Dialog) несёт каждая таблица.

			Обработчиков в разметке нет: нажатия по дням и кнопкам и наведение
			ловит плагин указателя, клавиши — плагин клавиатуры, оба слушают
			корень и зовут команды коллекции. Связка «нажали ⇄ выбрали» иначе
			повторилась бы в каждом из шести адаптеров. Панель выбора месяца и
			года лежит в том же корне, и нажатия по её шапке и подложке плагин
			указателя ловит так же.

			Слота по умолчанию нет: дни кладёт в коллекцию вид календаря по
			месяцам сеток, и день из разметки попал бы в неё мимо вида.
		-->

		<!--
			Месяцы — в ряд, своей строкой: ряд переносит месяцы, когда они не
			помещаются, а подвал — отдельная строка под ним. Подвал в одном ряду с
			месяцами расширил бы его своей шириной, и кнопки листания у конца
			корня повисли бы за последней колонкой.
		-->
		<div class="so-calendar__months">
			<!--
				Месяц — по одному на сетку (`grids`), ключ — место сетки, а не её
				месяц. Заголовок и его панель выбора — у места: листание меняет
				месяц, а кнопка заголовка, её поповер и живая область остаются тем
				же узлом. Иначе выбранный в панели месяц пересобрал бы блок вместе с
				кнопкой, и фокус, который панель возвращает на неё, упал бы на
				страницу, а смену месяца скринридер не объявил бы: новая живая область
				своё первое содержимое не читает. Дни при смене месяца пересобираются
				— их ключ дата. Месяцы стоят в ряд; высоту под шесть недель держит
				тема, и соседние сетки стоят вровень по строкам.
			-->
			<div v-for="(grid, index) in grids" :key="index" class="so-calendar__month">
				<!--
					Заголовок месяца — кнопка, которая открывает панель выбора месяца и
					года. Панель — Popover места (`pickers[index]`): экземпляры поповера и
					списка готовые, их создаёт и ведёт расширение коллекции `picker`, а
					разметка ничего не вычисляет — ни открытости, ни состава.

					Поповер внутри календаря (`contained`): панель не уходит в `body` и
					не встаёт под заголовком, а выезжает сверху календаря — его
					ближайшего позиционированного предка (`edge="top"`). Тема
					растягивает панель на весь календарь подложкой, а выбирают в
					карточке у её верхнего края (`.so-calendar__picker`): нажатие по
					подложке закрывает панель, его ловит плагин указателя. Жест за
					полосу включает расширение (`swipe` поповера места); карточку
					смахивают вверх, к её краю, а полоса — у её низа. Рисует полосу
					Popover — прямым потомком панели, иначе плагин жеста её не узнает.
					Корень поповера — `div`: панель лежит в нём, а внутри строчного
					`span` блочной разметке не место.

					Связку с панелью (`aria-haspopup`, `aria-expanded`, `aria-controls`) и
					вид «нажат» кнопка получает из scope слота триггера. Вида у неё нет:
					значения вида объявляет тема, и красит она кнопку по контексту
					(`.so-calendar__title`).

					Текст — во вложенном `span` с набором `grid.titleAria`: `id`, по
					которому сетку называет `aria-labelledby`, и `aria-live` — смену
					месяца скринридер объявляет сам. Набор на тексте, а не на кнопке:
					живая область — текст, а не контрол. Не `h*`: уровень заголовка
					знает страница, а календарь стоит где угодно.

					Панель называется своей шапкой (`labelledBy` — `id` шапки, его пишет
					плагин связок календаря).
				-->
				<Popover
					v-if="pickers[index]"
					embedded="calendar.picker"
					class="so-calendar__heading"
					tag="div"
					contained
					edge="top"
					:ctrl="pickers[index].popover"
					:aria_labelledBy="pickers[index].labelledBy"
				>
					<template #trigger="{ triggerAria, triggerDataset }">
						<Button
							embedded="calendar.title"
							type="button"
							class="so-calendar__title"
							:size="size"
							:disabled="disabled"
							v-bind="{ ...triggerAria, ...triggerDataset }"
						>
							<span class="so-calendar__title-text" v-bind="grid.titleAria">{{
								grid.title
							}}</span>
						</Button>
					</template>

					<!--
						The panel's content is a card: the list and the header. The list is
						the place's ListBox: the months of a year or the years of a page, 12
						each; the theme lays them out in 4 columns by 3 rows. The `picker`
						extension catches the choice in it — by the list's event, not by a
						handler here. A label wider than its tile wraps between words — a
						month's name of several words (`vi-VN` — "Tháng 10") and a year's
						label (with an era at `th-TH`, "พ.ศ. 2569"). The same extension sets
						the list's `contentFit` when it creates the list, and the markup does
						not pass it.

						The place gets its list with the first opening of the popover — the
						`change:open` that mounts this content — so the ListBox is drawn by the
						presence of `list` and takes `ctrl` and `engine` from it.

						The list comes before the header in the DOM: focus on opening lands on
						the panel's first stop — the list with the selected month, not the year
						button. The theme puts the header on top, like the buttons in the row
						of the Dialog's title.
					-->
					<div class="so-calendar__picker">
						<ListBox
							v-if="pickers[index].list"
							embedded="calendar.picker-list"
							class="so-calendar__picker-list"
							:ctrl="pickers[index].list.ctrl"
							:engine="pickers[index].list.engine"
							:size="size"
							indicator="none"
							:aria_labelledBy="pickers[index].labelledBy"
						/>

						<!--
							Шапка — первая строка карточки, устроена как ряд заголовков
							календаря: год или отрезок лет — у начала, стрелки — вплотную у
							конца, тех же размеров, что кнопки листания и заголовок месяца.
							В DOM кнопка года идёт перед стрелками — Tab идёт за глазом.
							Кнопка года переключает уровень: месяцы ⇄ годы; стрелки листают
							год на месяцах и страницу из 12 лет на годах. Нажатия ловит
							плагин указателя календаря. Имена стрелок и их выключенность —
							по уровню, из выхода панели; значок — та же роль `arrowRight`,
							что у кнопок листания, «назад» зеркалит тема.
						-->
						<div class="so-calendar__picker-header">
							<Button
								embedded="calendar.picker-heading"
								type="button"
								class="so-calendar__picker-heading"
								:size="size"
								v-bind="pickers[index].headingAria"
							>
								{{ pickers[index].heading }}
							</Button>

							<Button
								embedded="calendar.picker-prev"
								type="button"
								class="so-calendar__picker-prev"
								:size="size"
								:disabled="pickers[index].prevDisabled"
								v-bind="pickers[index].prevAria"
							>
								<Icon
									embedded="calendar.picker-prev-icon"
									:tag="arrowIconTag"
									:size="size"
								/>
							</Button>

							<Button
								embedded="calendar.picker-next"
								type="button"
								class="so-calendar__picker-next"
								:size="size"
								:disabled="pickers[index].nextDisabled"
								v-bind="pickers[index].nextAria"
							>
								<Icon
									embedded="calendar.picker-next-icon"
									:tag="arrowIconTag"
									:size="size"
								/>
							</Button>
						</div>
					</div>
				</Popover>

				<!--
					Кнопки листания — одна пара на весь календарь: «назад» и «вперёд»
					двигают все сетки разом. На экране пара стоит у конца ряда
					заголовков, вплотную, над двумя последними колонками, — как в
					календаре Android, а заголовок месяца — у начала ряда. В DOM она
					идёт сразу за заголовком первого месяца, чтобы Tab шёл за глазом:
					заголовок, «назад», «вперёд», остановка сетки — одна на все сетки,
					— и заголовки следующих месяцев. Место — у первой сетки, а не у
					последней: оно не меняется от числа сеток. Ставит пару тема — от
					корня календаря, а не от блока месяца.

					Вида разметка кнопкам не передаёт: красит их тема по контексту
					(`:where(.so-calendar__prev)`), как кнопки ленты Scroller.
					Выключенность считает вид коллекции — «календарь выключен или
					сетки дошли до месяца границы». Значок — иконка роли `arrowRight` у
					обеих: своей роли «влево» в контракте иконок нет, стрелку «назад»
					зеркалит тема, в RTL — «вперёд».
				-->
				<template v-if="index === 0">
					<Button
						embedded="calendar.prev"
						type="button"
						class="so-calendar__prev"
						:size="size"
						:disabled="prevDisabled"
						v-bind="prevAria"
					>
						<slot name="prev-icon">
							<Icon embedded="calendar.prev-icon" :tag="arrowIconTag" :size="size" />
						</slot>
					</Button>

					<Button
						embedded="calendar.next"
						type="button"
						class="so-calendar__next"
						:size="size"
						:disabled="nextDisabled"
						v-bind="nextAria"
					>
						<slot name="next-icon">
							<Icon embedded="calendar.next-icon" :tag="arrowIconTag" :size="size" />
						</slot>
					</Button>
				</template>

				<!--
					Сетка — `table` с набором `grid.gridAria` (`role="grid"`, имя от
					заголовка, `aria-multiselectable`).
				-->
				<table class="so-calendar__grid" v-bind="grid.gridAria">
					<!--
						Дни недели — подписи из `weekdays`, по `th` на день: короткое
						имя или узкое, какое выбрало ядро по локали.

						Строка скрыта от скринридера, и это отступление от APG, где у
						колонок есть заголовки: имя дня — полная дата, день недели в нём
						уже есть, и подписанная колонка прочла бы его второй раз. Поэтому
						и `abbr` у `th` не нужен.
					-->
					<thead aria-hidden="true">
						<tr class="so-calendar__weekdays">
							<th
								v-for="(weekday, index) in weekdays"
								:key="index"
								class="so-calendar__weekday"
							>
								{{ weekday.label }}
							</th>
						</tr>
					</thead>

					<tbody>
						<!--
							Неделя — семь ячеек, от первого дня недели; ключ — её
							первая дата.
						-->
						<tr
							v-for="week in grid.weeks"
							:key="week[0].date"
							class="so-calendar__week"
						>
							<!--
								Ячейка — ключ по дате: день, оставшийся на экране при
								листании, не пересобирается и не теряет фокус.
							-->
							<template v-for="cell in week" :key="cell.date">
								<!--
									День — `Calendar.Item` над элементом коллекции
									`cell.item`. Содержимое дня — слот `item` со scope
									`{ item, text }` (цена, точка события): день и scope
									его слота — номер дня в цифрах локали. Без него день
									рисует свой номер.
								-->
								<CalendarItem v-if="cell.item" :ctrl="cell.item">
									<template #default="{ text }">
										<slot name="item" :item="cell.item" :text="text" />
									</template>
								</CalendarItem>

								<!--
									Заполнитель — день соседнего месяца, у ячейки нет
									элемента. Это не день: ни числа, ни состояний, ни фокуса
									— число повторило бы дату, которая стоит в соседней
									сетке. Пустая ячейка держит место в неделе и получает
									набор ячейки (`cell.aria` — скрыта от скринридера).
								-->
								<td v-else class="so-calendar__filler" v-bind="cell.aria"></td>
							</template>
						</tr>
					</tbody>
				</table>
			</div>
		</div>

		<!--
			Подвал — строка под сетками во всю ширину календаря: ряд действий,
			которые кладёт потребитель (DatePicker с `confirmable` — «Отмена» и
			«OK»). В DOM он после сеток: его остановки Tab — последние. Обёртка
			рисуется, только когда слот передан, — пустая строка держала бы место
			под сетками.
		-->
		<div v-if="$slots.footer" class="so-calendar__footer">
			<slot name="footer" />
		</div>
	</component>
</template>
