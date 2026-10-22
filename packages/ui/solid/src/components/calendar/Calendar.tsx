import { Index, Show, type Accessor, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import type { TCalendarCell, TCalendarGrid, TCalendarPicker } from '@soldy-ui/core'
import type { DescriptorSlots, PopoverDescriptor } from '@soldy-ui/setup'
import {
	Elevate,
	KeyedFor,
	ResolvedSlot,
	createPartProps,
	createRootProps,
	relaySlot,
	roleIcon,
	rootTag,
} from '../../adapter'
import { Button } from '../button'
import { Icon } from '../icon'
import { ListBox } from '../list-box'
import { Popover } from '../popover'
import { CalendarItem } from './item'
import { setupCalendar } from './setup.component'
import type { CalendarProps } from './base.component'

/**
 * Одна иконка на все стрелки — листания и шапки панели выбора: роли «влево» в
 * контракте иконок нет, и ту стрелку, что смотрит в начало строки, зеркалит
 * тема. Компонент на роль — один на модуль: `tag` у Icon — корень, а не роль.
 */
const ARROW = roleIcon('arrowRight')

/** Scope слота триггера Popover — связка с панелью и вид «нажат». */
type TTriggerScope = DescriptorSlots<typeof PopoverDescriptor>['trigger']

/**
 * Calendar — сетки показанных месяцев, одна пара кнопок листания на все и
 * подвал, если его передали. Корень рисуется по `tag` (по умолчанию `div`), на
 * нём наборы `attrs`, `aria` и `dataset` (`data-disabled`), поверх — атрибуты
 * потребителя, `ref` адаптера последним. Роли у корня нет: сетку по APG (Date
 * Picker Dialog) несёт каждая таблица.
 *
 * Обработчиков в разметке нет: нажатия по дням, кнопкам листания, шапке и
 * подложке панели выбора и наведение ловит плагин указателя, клавиши — плагин
 * клавиатуры, оба слушают корень и зовут команды коллекции. Слота по
 * умолчанию нет: дни кладёт в коллекцию вид по месяцам сеток.
 *
 * Месяцы — в ряд, своей строкой (`so-calendar__months`), подвал — отдельной
 * строкой под ним: в одном ряду с месяцами он расширил бы его своей шириной.
 *
 * Месяц — по одному на сетку (`grids`), петлёй по месту (`Index`, как
 * `:key="index"` у Vue): заголовок и его панель выбора — у места, листание
 * меняет месяц, а кнопка заголовка, её поповер и живая область остаются тем же
 * узлом. Иначе выбранный в панели месяц пересобрал бы кнопку, фокус, который
 * панель возвращает на неё, упал бы на страницу, а новая живая область смену
 * месяца не объявила бы.
 *
 * Заголовок месяца — кнопка, которая открывает панель выбора месяца и года.
 * Панель — Popover места (`pickers[index]`): поповер, список и его движок
 * создаёт и ведёт расширение коллекции `picker`, и живут они вместе с движком.
 * `ctrl` и `engine` Popover и ListBox читают при сборке, поэтому `Show` по
 * панели места — не по записи (`keyed`): запись выхода новая на каждую смену,
 * а компоненты места собираются один раз, и разметка перечитывает из неё
 * шапку, стрелки и имена. Поповер — внутри календаря (`contained`, `edge="top"`):
 * панель не уходит в `body`, а выезжает сверху календаря, его ближайшего
 * позиционированного предка, и тема растягивает её подложкой. `Teleport`
 * Solid с `contained` рисует панель на месте, без своих обёрток, поэтому
 * панель — прямой потомок корня поповера, а он — прямой потомок месяца: на
 * цепочку `.so-calendar__month > .so-calendar__heading > .so-popover__panel`
 * опирается селектор темы. Корень поповера — `div`: панель лежит в нём, а
 * внутри строчного `span` блочной разметке не место.
 *
 * Триггер — функция слота: связку с панелью (`aria-haspopup`,
 * `aria-expanded`, `aria-controls`) и вид «нажат» кнопка получает из живого
 * scope и читает его в разметке (`{...scope.triggerAria}`), без
 * деструктуризации: связка меняется на каждое открытие, а кнопка остаётся тем
 * же узлом, с фокусом на ней. Вида у кнопки нет — тема красит её по контексту
 * (`.so-calendar__title`). Текст — во вложенном `span` с набором `titleAria`:
 * `id`, по которому сетку называет `aria-labelledby`, и `aria-live` — живая
 * область — текст, а не контрол.
 *
 * Содержимое панели — карточка: список места (12 месяцев года или 12 лет
 * страницы; `contentFit` ему ставит расширение) и шапка — кнопка года, затем
 * стрелки. Список в DOM раньше шапки: фокус при открытии встаёт на список, а
 * наверх шапку ставит тема. Панель и список названы шапкой (`aria_labelledBy`).
 *
 * Кнопки листания — одна пара на весь календарь, у первого месяца, сразу за
 * его заголовком: Tab идёт за глазом. Вида у них нет — красит тема по
 * контексту; выключенность считает вид коллекции, имена — в наборах
 * `prevAria` и `nextAria`. Значок — слот `prev-icon` или `next-icon`, иначе
 * иконка роли `arrowRight`.
 *
 * Сетка — `table` с набором `gridAria` (`role="grid"`, имя от заголовка,
 * `aria-multiselectable`). Шапка дней недели скрыта от скринридера
 * (`aria-hidden` на `thead`): имя дня — полная дата. Подписи колонок —
 * `weekdays` по месту (`Index`). Недели — по ключу первой даты, ячейки — по
 * дате (`KeyedFor`): записи сеток новые на каждую смену, и `<For>`,
 * сравнивая их по ссылке, пересоздавал бы дни вместе с фокусом, а день,
 * оставшийся на экране при листании, — тот же узел. Ячейка — день
 * (`Calendar.Item` над элементом коллекции, `Show` по элементу — `keyed`:
 * `ctrl` день читает при сборке) или заполнитель соседнего месяца — пустой
 * `td` с набором ячейки (`aria-hidden`). Содержимое дня — слот `item`,
 * проброшенный целиком (`relaySlot`): scope — номер дня и сам день.
 *
 * Подвал — слот `footer`: строка под сетками, только когда слот задан (так
 * DatePicker с `confirmable` кладёт сюда «Отмену» и «OK»).
 *
 * Всё содержимое — в слое лифта календаря (`Elevate`): день, смонтированный
 * внутри, прочтёт движок и регистратор этого календаря. Слоты разворачиваются
 * там же: узлы слота Solid создаёт там, где его развернули.
 */
export function Calendar(props: CalendarProps): JSX.Element {
	const binding = setupCalendar(props)
	const state = binding.state
	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
	}))

	/** Ячейка недели: день — элемент коллекции, заполнитель — пустая ячейка. */
	const cell = (entry: Accessor<TCalendarCell>) => {
		const aria = createPartProps(() => entry().aria)

		return (
			<Show
				when={entry().item}
				keyed
				fallback={<td class="so-calendar__filler" {...aria()} />}
			>
				{(item) => (
					<CalendarItem ctrl={item}>{relaySlot(props.item, { item })}</CalendarItem>
				)}
			</Show>
		)
	}

	/** Неделя — семь ячеек, от первого дня недели. */
	const week = (entry: Accessor<TCalendarCell[]>) => (
		<tr class="so-calendar__week">
			<KeyedFor each={entry()} by={(day) => day.date}>
				{cell}
			</KeyedFor>
		</tr>
	)

	/** Заголовок месяца — кнопка-триггер панели выбора; текст и живая область внутри. */
	const title = (grid: Accessor<TCalendarGrid>) => (scope: TTriggerScope) => {
		const titleAria = createPartProps(() => grid().titleAria)

		return (
			<Button
				embedded="calendar.title"
				type="button"
				class="so-calendar__title"
				size={state.size}
				disabled={state.disabled}
				{...scope.triggerAria}
				{...scope.triggerDataset}
			>
				<span class="so-calendar__title-text" {...titleAria()}>
					{grid().title}
				</span>
			</Button>
		)
	}

	/** Карточка панели выбора: список места, за ним — шапка. */
	const card = (picker: Accessor<TCalendarPicker>) => (
		<div class="so-calendar__picker">
			<ListBox
				embedded="calendar.picker-list"
				class="so-calendar__picker-list"
				ctrl={picker().list}
				engine={picker().engine}
				size={state.size}
				indicator="none"
				aria_labelledBy={picker().labelledBy}
			/>
			<div class="so-calendar__picker-header">
				<Button
					embedded="calendar.picker-heading"
					type="button"
					class="so-calendar__picker-heading"
					size={state.size}
					{...picker().headingAria}
				>
					{picker().heading}
				</Button>
				<Button
					embedded="calendar.picker-prev"
					type="button"
					class="so-calendar__picker-prev"
					size={state.size}
					disabled={picker().prevDisabled}
					{...picker().prevAria}
				>
					<Icon embedded="calendar.picker-prev-icon" tag={ARROW} size={state.size} />
				</Button>
				<Button
					embedded="calendar.picker-next"
					type="button"
					class="so-calendar__picker-next"
					size={state.size}
					disabled={picker().nextDisabled}
					{...picker().nextAria}
				>
					<Icon embedded="calendar.picker-next-icon" tag={ARROW} size={state.size} />
				</Button>
			</div>
		</div>
	)

	/** Пара кнопок листания — одна на весь календарь, у первого месяца. */
	const paging = () => (
		<>
			<Button
				embedded="calendar.prev"
				type="button"
				class="so-calendar__prev"
				size={state.size}
				disabled={state.prevDisabled}
				{...state.prevAria}
			>
				<ResolvedSlot
					content={props['prev-icon']}
					fallback={<Icon embedded="calendar.prev-icon" tag={ARROW} size={state.size} />}
				/>
			</Button>
			<Button
				embedded="calendar.next"
				type="button"
				class="so-calendar__next"
				size={state.size}
				disabled={state.nextDisabled}
				{...state.nextAria}
			>
				<ResolvedSlot
					content={props['next-icon']}
					fallback={<Icon embedded="calendar.next-icon" tag={ARROW} size={state.size} />}
				/>
			</Button>
		</>
	)

	/** Месяц места `index`: заголовок с панелью выбора, листание у первого, сетка. */
	const month = (grid: Accessor<TCalendarGrid>, index: number) => {
		const gridAria = createPartProps(() => grid().gridAria)

		return (
			<div class="so-calendar__month">
				<Show when={state.pickers?.[index]}>
					{(picker) => (
						<Popover
							embedded="calendar.picker"
							class="so-calendar__heading"
							tag="div"
							contained
							edge="top"
							ctrl={picker().popover}
							aria_labelledBy={picker().labelledBy}
							trigger={title(grid)}
						>
							{card(picker)}
						</Popover>
					)}
				</Show>
				<Show when={index === 0}>{paging()}</Show>
				<table class="so-calendar__grid" {...gridAria()}>
					<thead aria-hidden="true">
						<tr class="so-calendar__weekdays">
							<Index each={state.weekdays}>
								{(weekday) => (
									<th class="so-calendar__weekday">{weekday().label}</th>
								)}
							</Index>
						</tr>
					</thead>
					<tbody>
						<KeyedFor each={grid().weeks} by={(days) => days[0]?.date}>
							{week}
						</KeyedFor>
					</tbody>
				</table>
			</div>
		)
	}

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<Elevate layer={binding.layer}>
					<div class="so-calendar__months">
						<Index each={state.grids}>{month}</Index>
					</div>
					<ResolvedSlot content={props.footer}>
						{(nodes) => <div class="so-calendar__footer">{nodes()}</div>}
					</ResolvedSlot>
				</Elevate>
			</Dynamic>
		</Show>
	)
}
