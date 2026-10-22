import type { ElementType, ReactElement, ReactNode } from 'react'
import type { TCalendarCell, TCalendarGrid, TCalendarPicker } from '@soldy-ui/core'
import type { DescriptorSlots, PopoverDescriptor } from '@soldy-ui/setup'
import {
	Elevate,
	hasSlot,
	relaySlot,
	renderSlot,
	roleIcon,
	toAriaProps,
	toRootProps,
} from '../../adapter'
import { Button, type ButtonProps } from '../button'
import { Icon } from '../icon'
import { ListBox } from '../list-box'
import { Popover } from '../popover'
import { CalendarItem } from './item'
import { useSetupCalendar } from './setup.component'
import type { CalendarProps } from './base.component'

/**
 * Одна иконка на все стрелки — листания и шапки панели выбора: роли «влево» в
 * контракте иконок нет, и ту стрелку, что смотрит в начало строки, зеркалит
 * тема. Компонент на роль — один на модуль (`roleIcon`).
 */
const ARROW = roleIcon('arrowRight')

/** Scope слота триггера Popover — связка с панелью и вид «нажат». */
type TTriggerScope = DescriptorSlots<typeof PopoverDescriptor>['trigger']

/** Размер календаря — кнопкам и спискам в его разметке. */
type TSize = ButtonProps['size']

/** Ячейка недели: день — элемент коллекции, заполнитель — пустая ячейка. */
function drawCell(props: CalendarProps, cell: TCalendarCell): ReactElement {
	const { item } = cell

	if (!item) {
		return <td key={cell.date} className="so-calendar__filler" {...toAriaProps(cell.aria)} />
	}

	return (
		<CalendarItem key={cell.date} ctrl={item}>
			{relaySlot(props.item, { item })}
		</CalendarItem>
	)
}

/** Карточка панели выбора: список места, за ним — шапка. */
function drawCard(picker: TCalendarPicker, size: TSize): ReactNode {
	return (
		<div className="so-calendar__picker">
			<ListBox
				embedded="calendar.picker-list"
				className="so-calendar__picker-list"
				ctrl={picker.list}
				engine={picker.engine}
				size={size}
				indicator="none"
				aria_labelledBy={picker.labelledBy}
			/>
			<div className="so-calendar__picker-header">
				<Button
					embedded="calendar.picker-heading"
					type="button"
					className="so-calendar__picker-heading"
					size={size}
					{...toAriaProps(picker.headingAria)}
				>
					{picker.heading}
				</Button>
				<Button
					embedded="calendar.picker-prev"
					type="button"
					className="so-calendar__picker-prev"
					size={size}
					disabled={picker.prevDisabled}
					{...toAriaProps(picker.prevAria)}
				>
					<Icon embedded="calendar.picker-prev-icon" tag={ARROW} size={size} />
				</Button>
				<Button
					embedded="calendar.picker-next"
					type="button"
					className="so-calendar__picker-next"
					size={size}
					disabled={picker.nextDisabled}
					{...toAriaProps(picker.nextAria)}
				>
					<Icon embedded="calendar.picker-next-icon" tag={ARROW} size={size} />
				</Button>
			</div>
		</div>
	)
}

/**
 * Calendar — сетки показанных месяцев, одна пара кнопок листания на все и
 * подвал, если его передали. Корень рисуется по `tag` (по умолчанию `div`), на
 * нём наборы `attrs`, `aria` и `dataset` (`data-disabled`), поверх — атрибуты
 * потребителя, `ref` адаптера последним. Роли у корня нет: сетку по APG (Date
 * Picker Dialog) несёт каждая таблица.
 *
 * Обработчиков в разметке нет: нажатия по дням, кнопкам листания, шапке и
 * подложке панели выбора и наведение ловит плагин указателя, клавиши — плагин
 * клавиатуры, оба слушают корень и зовут команды коллекции. Слота `children`
 * нет: дни кладёт в коллекцию вид по месяцам сеток.
 *
 * Месяцы — в ряд, своей строкой (`so-calendar__months`), подвал — отдельной
 * строкой под ним: в одном ряду с месяцами он расширил бы его своей шириной.
 *
 * Месяц — по одному на сетку (`grids`), ключ — место сетки (`index`), а не её
 * месяц: заголовок и его панель выбора — у места, листание меняет месяц, а
 * кнопка заголовка, её поповер и живая область остаются тем же узлом. Иначе
 * выбранный в панели месяц пересобрал бы кнопку, фокус, который панель
 * возвращает на неё, упал бы на страницу, а новая живая область смену месяца
 * не объявила бы.
 *
 * Заголовок месяца — кнопка, которая открывает панель выбора месяца и года.
 * Панель — Popover места (`pickers[index]`): поповер, список и его движок
 * создаёт и ведёт расширение коллекции `picker`, и живут они вместе с
 * движком. Ключ поповера — его экземпляр: пересобранный календарь без движка
 * снаружи (StrictMode, `<Activity>`) — новый движок с новыми местами, а
 * поповер через лифт ничего меняющегося не читает и сам не пересоберётся, —
 * без ключа он остался бы над прежним экземпляром. Поповер — внутри календаря
 * (`contained`, `edge="top"`): панель не уходит в `body`, а выезжает сверху
 * календаря, его ближайшего позиционированного предка, и тема растягивает её
 * подложкой. Корень поповера — `div`: панель лежит в нём, а внутри строчного
 * `span` блочной разметке не место.
 *
 * Триггер — функция слота: связку с панелью (`aria-haspopup`,
 * `aria-expanded`, `aria-controls`) и вид «нажат» кнопка получает из scope.
 * Вида у кнопки нет — тема красит её по контексту (`.so-calendar__title`).
 * Текст — во вложенном `span` с набором `titleAria`: `id`, по которому сетку
 * называет `aria-labelledby`, и `aria-live` — живая область — текст, а не
 * контрол.
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
 * (`aria-hidden` на `thead`): имя дня — полная дата. Неделя — ключ по первой
 * дате, ячейка — по дате: день, оставшийся на экране при листании, — тот же
 * узел, с фокусом на нём. Ячейка — день (`Calendar.Item` над элементом
 * коллекции) или заполнитель соседнего месяца — пустой `td` с набором ячейки
 * (`aria-hidden`). Содержимое дня — слот `item`, проброшенный целиком
 * (`relaySlot`): scope — номер дня и сам день.
 *
 * Подвал — слот `footer`: строка под сетками, только когда слот задан (так
 * DatePicker с `confirmable` кладёт сюда «Отмену» и «OK»).
 *
 * Всё содержимое — в слое лифта календаря (`Elevate`): день, смонтированный
 * внутри, прочтёт движок и регистратор этого календаря и при коммите войдёт в
 * его коллекцию.
 */
export function Calendar(props: CalendarProps): ReactElement | null {
	const { ref, forwardProps, state, layer } = useSetupCalendar(props)

	const {
		rendered,
		tag,
		attrs,
		aria,
		dataset,
		size,
		disabled,
		grids,
		pickers,
		weekdays,
		prevDisabled,
		nextDisabled,
		prevAria,
		nextAria,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType

	/** Заголовок месяца — кнопка-триггер панели выбора; текст и живая область внутри. */
	const title =
		(grid: TCalendarGrid) =>
		({ triggerAria, triggerDataset }: TTriggerScope): ReactNode => (
			<Button
				embedded="calendar.title"
				type="button"
				className="so-calendar__title"
				size={size}
				disabled={disabled}
				{...toAriaProps(triggerAria)}
				{...toAriaProps(triggerDataset)}
			>
				<span className="so-calendar__title-text" {...toAriaProps(grid.titleAria)}>
					{grid.title}
				</span>
			</Button>
		)

	/** Пара кнопок листания — одна на весь календарь, у первого месяца. */
	const paging = (
		<>
			<Button
				embedded="calendar.prev"
				type="button"
				className="so-calendar__prev"
				size={size}
				disabled={prevDisabled}
				{...toAriaProps(prevAria)}
			>
				{renderSlot(props['prev-icon']) ?? (
					<Icon embedded="calendar.prev-icon" tag={ARROW} size={size} />
				)}
			</Button>
			<Button
				embedded="calendar.next"
				type="button"
				className="so-calendar__next"
				size={size}
				disabled={nextDisabled}
				{...toAriaProps(nextAria)}
			>
				{renderSlot(props['next-icon']) ?? (
					<Icon embedded="calendar.next-icon" tag={ARROW} size={size} />
				)}
			</Button>
		</>
	)

	/** Месяц места `index`: заголовок с панелью выбора, листание у первого, сетка. */
	const month = (grid: TCalendarGrid, index: number): ReactElement => {
		const picker = pickers?.[index]

		return (
			<div key={index} className="so-calendar__month">
				{picker ? (
					<Popover
						key={picker.popover.uid}
						embedded="calendar.picker"
						className="so-calendar__heading"
						tag="div"
						contained
						edge="top"
						ctrl={picker.popover}
						aria_labelledBy={picker.labelledBy}
						trigger={title(grid)}
					>
						{drawCard(picker, size)}
					</Popover>
				) : null}
				{index === 0 ? paging : null}
				<table className="so-calendar__grid" {...toAriaProps(grid.gridAria)}>
					<thead aria-hidden="true">
						<tr className="so-calendar__weekdays">
							{weekdays?.map((weekday, column) => (
								<th key={column} className="so-calendar__weekday">
									{weekday.label}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{grid.weeks.map((week) => (
							<tr key={week[0]?.date} className="so-calendar__week">
								{week.map((cell) => drawCell(props, cell))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		)
	}

	return (
		<Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)}>
			<Elevate layer={layer}>
				<div className="so-calendar__months">{grids?.map(month)}</div>
				{hasSlot(props.footer) ? (
					<div className="so-calendar__footer">{renderSlot(props.footer)}</div>
				) : null}
			</Elevate>
		</Tag>
	)
}
