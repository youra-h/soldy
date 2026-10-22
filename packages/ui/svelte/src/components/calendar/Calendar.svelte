<script lang="ts">
	import type { DescriptorSlots, PopoverDescriptor } from '@soldy-ui/setup'
	import { Dynamic, roleIcon, toRootProps } from '../../adapter'
	import { Button } from '../button'
	import { Icon } from '../icon'
	import { ListBox } from '../list-box'
	import { Popover } from '../popover'
	import { CalendarItem } from './item'
	import { setupCalendar } from './setup.component'
	import type { CalendarProps } from './base.component'

	/** Scope сниппета триггера Popover — связка с панелью и вид «нажат». */
	type TTriggerScope = DescriptorSlots<typeof PopoverDescriptor>['trigger']

	let { ref = $bindable(), ...props }: CalendarProps = $props()
	const mountId = $props.id()

	const binding = setupCalendar(() => props, mountId, (node) => (ref = node))
	const state = binding.state

	/**
	 * Одна иконка на все стрелки — листания и шапки панели выбора: роли «влево»
	 * в контракте иконок нет, и ту стрелку, что смотрит в начало строки, зеркалит
	 * тема. Метка роли: `tag` у Icon — корень, а не роль.
	 */
	const ARROW = roleIcon('arrowRight')
</script>

<!--
	Calendar — сетки показанных месяцев, одна пара кнопок листания на все и
	подвал, если его передали, как у Vue. Корень рисуется по `tag` (по
	умолчанию `div`), на нём наборы `attrs`, `aria` и `dataset`
	(`data-disabled`), поверх — атрибуты потребителя. Роли у корня нет: сетку по
	APG (Date Picker Dialog) несёт каждая таблица. `ref` — корень.

	Обработчиков в разметке нет: нажатия по дням, кнопкам листания, шапке и
	подложке панели выбора и наведение ловит плагин указателя, клавиши — плагин
	клавиатуры, оба слушают корень и зовут команды коллекции. Слота по
	умолчанию нет: дни кладёт в коллекцию вид по месяцам сеток.

	Месяцы — в ряд, своей строкой (`so-calendar__months`), подвал — отдельной
	строкой под ним: в одном ряду с месяцами он расширил бы его своей шириной.

	Месяц — по одному на сетку (`grids`), петлёй с ключом-индексом: ключ —
	место сетки, а не её месяц. Заголовок и его панель выбора — у места:
	листание меняет месяц, а кнопка заголовка, её поповер и живая область
	остаются тем же узлом. Иначе выбранный в панели месяц пересобрал бы кнопку,
	фокус, который панель возвращает на неё, упал бы на страницу, а новая
	живая область смену месяца не объявила бы.

	Заголовок месяца — кнопка, которая открывает панель выбора месяца и года.
	Панель — Popover места (`pickers[index]`): поповер, список и его движок
	создаёт и ведёт расширение коллекции `picker`, и живут они вместе с движком.
	Popover и ListBox берут `ctrl` и `engine` один раз, при сборке, а запись
	выхода новая на каждую смену, — поэтому блок места стоит по наличию записи,
	а не по ней самой: компоненты места собираются один раз, а шапку, стрелки и
	имена разметка перечитывает из новой записи. Поповер — внутри календаря
	(`contained`, `edge="top"`): панель не уходит в `body`, а выезжает сверху
	календаря, его ближайшего позиционированного предка, и тема растягивает её
	подложкой. Корень поповера — `div`: панель лежит в нём, а внутри строчного
	`span` блочной разметке не место.

	Триггер — сниппет `trigger`: связку с панелью (`aria-haspopup`,
	`aria-expanded`, `aria-controls`) и вид «нажат» кнопка получает из его
	scope. Вида у кнопки нет — тема красит её по контексту
	(`.so-calendar__title`). Текст — во вложенном `span` с набором `titleAria`:
	`id`, по которому сетку называет `aria-labelledby`, и `aria-live` — живая
	область — текст, а не контрол.

	Содержимое панели — карточка: список места (12 месяцев года или 12 лет
	страницы; `contentFit` ему ставит расширение) и шапка — кнопка года, затем
	стрелки. Список в DOM раньше шапки: фокус при открытии встаёт на список, а
	наверх шапку ставит тема. Панель и список названы шапкой (`aria_labelledBy`).

	Кнопки листания — одна пара на весь календарь, у первого месяца, сразу за
	его заголовком: Tab идёт за глазом. Вида у них нет — красит тема по
	контексту; выключенность считает вид коллекции, имена — в наборах
	`prevAria` и `nextAria`. Значок — сниппет `prev-icon` или `next-icon`, иначе
	иконка роли `arrowRight`.

	Сетка — `table` с набором `gridAria` (`role="grid"`, имя от заголовка,
	`aria-multiselectable`). Шапка дней недели скрыта от скринридера
	(`aria-hidden` на `thead`): имя дня — полная дата. Подписи колонок —
	`weekdays` по месту. Недели — по ключу первой даты, ячейки — по дате:
	записи сеток новые на каждую смену, а день, оставшийся на экране при
	листании, — тот же узел, с фокусом на нём. Ячейка — день (`Calendar.Item`
	над элементом коллекции) или заполнитель соседнего месяца — пустой `td` с
	набором ячейки (`aria-hidden`). День берёт `ctrl` при сборке, поэтому
	другой элемент на той же дате — новый день (`{#key}`). Содержимое дня —
	проброс слота `item`: сниппет, который день зовёт со своим scope, плюс сам
	день. Отдаётся он, только когда слот задан календарю: сниппет непрозрачен,
	и пустой проброс номера дня не уступил бы.

	Подвал — сниппет `footer`: строка под сетками, только когда он задан (так
	DatePicker с `confirmable` кладёт сюда «Отмену» и «OK»).

	День, смонтированный внутри, читает движок и регистратор календаря лифтом
	(`setContext` календаря) и входит в его коллекцию при своей инициализации,
	на сервере тоже. Панели выбора на сервере нет: поповер с `contained`
	рисует её на месте, скрытой.

	Узлы стоят вплотную: пробел между блоками Svelte оставил бы текстом в
	месяце, в строках таблицы, в шапке панели и в подвале.
-->
{#if state.rendered}
	<Dynamic
		tag={state.tag}
		attributes={toRootProps(
			state,
			[state.attrs, state.aria, state.dataset],
			binding.forwardProps,
		)}
		attach={binding.attachElement}
	>
		<div class="so-calendar__months">
			{#each state.grids ?? [] as grid, index (index)}
				{@const picker = state.pickers?.[index]}
				{#snippet title({ triggerAria, triggerDataset }: TTriggerScope)}
					<Button
						embedded="calendar.title"
						type="button"
						class="so-calendar__title"
						size={state.size}
						disabled={state.disabled}
						{...triggerAria}
						{...triggerDataset}
						><span class="so-calendar__title-text" {...grid.titleAria}>{grid.title}</span
						></Button
					>
				{/snippet}
				<div class="so-calendar__month">
					{#if picker}<Popover
							embedded="calendar.picker"
							class="so-calendar__heading"
							tag="div"
							contained
							edge="top"
							ctrl={picker.popover}
							aria_labelledBy={picker.labelledBy}
							trigger={title}
							><div class="so-calendar__picker">
								<ListBox
									embedded="calendar.picker-list"
									class="so-calendar__picker-list"
									ctrl={picker.list}
									engine={picker.engine}
									size={state.size}
									indicator="none"
									aria_labelledBy={picker.labelledBy}
								/><div class="so-calendar__picker-header">
									<Button
										embedded="calendar.picker-heading"
										type="button"
										class="so-calendar__picker-heading"
										size={state.size}
										{...picker.headingAria}>{picker.heading}</Button
									><Button
										embedded="calendar.picker-prev"
										type="button"
										class="so-calendar__picker-prev"
										size={state.size}
										disabled={picker.prevDisabled}
										{...picker.prevAria}
										><Icon
											embedded="calendar.picker-prev-icon"
											tag={ARROW}
											size={state.size}
										/></Button
									><Button
										embedded="calendar.picker-next"
										type="button"
										class="so-calendar__picker-next"
										size={state.size}
										disabled={picker.nextDisabled}
										{...picker.nextAria}
										><Icon
											embedded="calendar.picker-next-icon"
											tag={ARROW}
											size={state.size}
										/></Button
									>
								</div>
							</div></Popover
						>{/if}{#if index === 0}<Button
							embedded="calendar.prev"
							type="button"
							class="so-calendar__prev"
							size={state.size}
							disabled={state.prevDisabled}
							{...state.prevAria}
						>
							{#if props['prev-icon']}
								{@render props['prev-icon']()}
							{:else}
								<Icon embedded="calendar.prev-icon" tag={ARROW} size={state.size} />
							{/if}
						</Button><Button
							embedded="calendar.next"
							type="button"
							class="so-calendar__next"
							size={state.size}
							disabled={state.nextDisabled}
							{...state.nextAria}
						>
							{#if props['next-icon']}
								{@render props['next-icon']()}
							{:else}
								<Icon embedded="calendar.next-icon" tag={ARROW} size={state.size} />
							{/if}
						</Button>{/if}<table class="so-calendar__grid" {...grid.gridAria}>
						<thead aria-hidden="true">
							<tr class="so-calendar__weekdays">
								{#each state.weekdays ?? [] as weekday, place (place)}
									<th class="so-calendar__weekday">{weekday.label}</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each grid.weeks as week (week[0]?.date)}
								<tr class="so-calendar__week">
									{#each week as cell (cell.date)}
										{#if cell.item}
											{@const item = cell.item}
											{#snippet day(scope: { text: string })}
												{@render props.item?.({ ...scope, item })}
											{/snippet}
											{#key item}
												<CalendarItem
													ctrl={item}
													children={props.item ? day : undefined}
												/>
											{/key}
										{:else}
											<td class="so-calendar__filler" {...cell.aria}></td>
										{/if}
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/each}
		</div>{#if props.footer}<div class="so-calendar__footer">{@render props.footer()}</div>{/if}
	</Dynamic>
{/if}
