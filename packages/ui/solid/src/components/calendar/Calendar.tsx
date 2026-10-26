import type { Accessor, JSX } from 'solid-js'
import type { TCalendarCell, TCalendarGrid, TCalendarPicker } from '@soldy-ui/core'
import type { DescriptorSlots, PopoverDescriptor } from '@soldy-ui/setup'
import {
	Elevate,
	KeyedFor,
	ResolvedSlot,
	Root,
	createPartProps,
	createRootProps,
	relaySlot,
	roleIcon,
} from '../../adapter'
import { Index, Show } from '../../adapter/runtime/flow'
import { Button } from '../button'
import { Icon } from '../icon'
import { ListBox } from '../list-box'
import { Popover } from '../popover'
import { CalendarItem } from './item'
import { setupCalendar } from './setup.component'
import type { CalendarProps } from './base.component'

/** Одна иконка на все стрелки: роли «влево» нет, стрелку к началу строки зеркалит тема. */
const ARROW = roleIcon('arrowRight')

/** Scope слота триггера Popover — связка с панелью и вид «нажат». */
type TTriggerScope = DescriptorSlots<typeof PopoverDescriptor>['trigger']

/**
 * Календарь: сетки показанных месяцев, одна пара кнопок листания у первого месяца и подвал.
 * Месяц — по месту (`Index`): кнопка заголовка, её поповер и живая область переживают
 * листание тем же узлом. Панель выбора — Popover места, `contained` на `div`.
 */
export function Calendar(props: CalendarProps): JSX.Element {
	const binding = setupCalendar(props)
	const state = binding.state
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

	/**
	 * The picker's card: the place's list, then the header. The list comes with the first
	 * opening of the popover — a branch by its presence, and ListBox takes `ctrl` and `engine`
	 * at assembly.
	 */
	const card = (picker: Accessor<TCalendarPicker>) => (
		<div class="so-calendar__picker">
			<Show when={picker().list}>
				{(list) => (
					<ListBox
						embedded="calendar.picker-list"
						class="so-calendar__picker-list"
						ctrl={list().ctrl}
						engine={list().engine}
						size={state.size}
						indicator="none"
						aria_labelledBy={picker().labelledBy}
					/>
				)}
			</Show>
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
			<Root tag={state.tag} attributes={root} ref={binding.ref}>
				<Elevate layer={binding.layer}>
					<div class="so-calendar__months">
						<Index each={state.grids}>{month}</Index>
					</div>
					<ResolvedSlot content={props.footer}>
						{(nodes) => <div class="so-calendar__footer">{nodes()}</div>}
					</ResolvedSlot>
				</Elevate>
			</Root>
		</Show>
	)
}
