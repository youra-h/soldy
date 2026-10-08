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
		<div class="s-calendar__months">
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
			<div v-for="(grid, index) in grids" :key="index" class="s-calendar__month">
				<!--
					Заголовок месяца — кнопка, которая открывает панель выбора месяца и
					года. Панель — Popover места (`pickers[index]`): экземпляры поповера и
					списка готовые, их создаёт и ведёт расширение коллекции `picker`, а
					разметка ничего не вычисляет — ни открытости, ни состава.

					Поповер внутри календаря (`contained`): панель не уходит в `body` и
					не встаёт под заголовком, а выезжает сверху календаря — его
					ближайшего позиционированного предка (`edge="top"`). Тема
					растягивает панель на весь календарь подложкой, а выбирают в
					карточке у её верхнего края (`.s-calendar__picker`): нажатие по
					подложке закрывает панель, его ловит плагин указателя. Жест за
					полосу включает расширение (`swipe` поповера места); карточку
					смахивают вверх, к её краю, а полоса — у её низа. Рисует полосу
					Popover — прямым потомком панели, иначе плагин жеста её не узнает.
					Корень поповера — `div`: панель лежит в нём, а внутри строчного
					`span` блочной разметке не место.

					Связку с панелью (`aria-haspopup`, `aria-expanded`, `aria-controls`) и
					вид «нажат» кнопка получает из scope слота триггера. Вида у неё нет:
					значения вида объявляет тема, и красит она кнопку по контексту
					(`.s-calendar__title`).

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
					class="s-calendar__heading"
					tag="div"
					contained
					edge="top"
					:ctrl="pickers[index].popover"
					:aria_labelledBy="pickers[index].labelledBy"
				>
					<template #trigger="{ triggerAria, triggerDataset }">
						<Button
							embedded="calendar.title"
							class="s-calendar__title"
							:size="size"
							:disabled="disabled"
							v-bind="{ ...triggerAria, ...triggerDataset }"
						>
							<span class="s-calendar__title-text" v-bind="grid.titleAria">{{
								grid.title
							}}</span>
						</Button>
					</template>

					<!--
						Содержимое панели — карточка: список и шапка. Список — ListBox
						места: месяцы года или годы страницы, по 12; раскладку в 4 колонки
						по 3 строки даёт тема. Выбор в нём ловит расширение `picker` —
						событием списка, а не обработчиком здесь. Подпись шире плитки
						список переносит между словами — имя месяца в несколько слов (у
						`vi-VN` — «Tháng 10») и подпись года (у `th-TH` — с эрой,
						«พ.ศ. 2569»). `contentFit` списку ставит то же расширение, когда
						создаёт список, и разметка его не передаёт.

						Список в DOM раньше шапки: фокус при открытии встаёт на первую
						остановку панели — на список с выбранным месяцем, а не на кнопку
						года. Наверх шапку ставит тема, как кнопки в ряд заголовка Dialog.
					-->
					<div class="s-calendar__picker">
						<ListBox
							embedded="calendar.picker-list"
							class="s-calendar__picker-list"
							:ctrl="pickers[index].list"
							:engine="pickers[index].engine"
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
						<div class="s-calendar__picker-header">
							<Button
								embedded="calendar.picker-heading"
								class="s-calendar__picker-heading"
								:size="size"
								v-bind="pickers[index].headingAria"
							>
								{{ pickers[index].heading }}
							</Button>

							<Button
								embedded="calendar.picker-prev"
								class="s-calendar__picker-prev"
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
								class="s-calendar__picker-next"
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
					(`:where(.s-calendar__prev)`), как кнопки ленты Scroller.
					Выключенность считает вид коллекции — «календарь выключен или
					сетки дошли до месяца границы». Значок — иконка роли `arrowRight` у
					обеих: своей роли «влево» в контракте иконок нет, стрелку «назад»
					зеркалит тема, в RTL — «вперёд».
				-->
				<template v-if="index === 0">
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
				</template>

				<!--
					Сетка — `table` с набором `grid.gridAria` (`role="grid"`, имя от
					заголовка, `aria-multiselectable`).
				-->
				<table class="s-calendar__grid" v-bind="grid.gridAria">
					<!--
						Дни недели — узкие имена из `weekdays`, по `th` на день.

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
								{{ weekday.narrow }}
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
		</div>

		<!--
			Подвал — строка под сетками во всю ширину календаря: ряд действий,
			которые кладёт потребитель (DatePicker с `confirmable` — «Отмена» и
			«OK»). В DOM он после сеток: его остановки Tab — последние. Обёртка
			рисуется, только когда слот передан, — пустая строка держала бы место
			под сетками.
		-->
		<div v-if="$slots.footer" class="s-calendar__footer">
			<slot name="footer" />
		</div>
	</component>
</template>
