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

/** One icon for all arrows: there is no «left» role, the theme mirrors the arrow to the line start. */
const ARROW = roleIcon('arrowRight')

/** Scope of the Popover trigger slot — the link to the panel and the pressed look. */
type TTriggerScope = DescriptorSlots<typeof PopoverDescriptor>['trigger']

type TSize = ButtonProps['size']

/** A week cell: a day is a collection item, a placeholder is an empty cell. */
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

/**
 * The picker's card: the list comes before the header in the DOM — focus on opening lands on it.
 * The place gets its list with the first opening of the popover; the list is keyed by its instance.
 */
function drawCard(picker: TCalendarPicker, size: TSize): ReactNode {
	const { list } = picker

	return (
		<div className="so-calendar__picker">
			{list ? (
				<ListBox
					key={list.ctrl.uid}
					embedded="calendar.picker-list"
					className="so-calendar__picker-list"
					ctrl={list.ctrl}
					engine={list.engine}
					size={size}
					indicator="none"
					aria_labelledBy={picker.labelledBy}
				/>
			) : null}
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
 * Calendar — grids of the shown months, paging and the footer: docs/agents/dates.md, «Даты».
 * The popover is keyed by its instance: AGENTS.md (React), «Пересобранный инстанс и `key`».
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
						{/* A week is keyed by its place: a new first day of the week keeps six days of seven in their row */}
						{grid.weeks.map((week, place) => (
							<tr key={place} className="so-calendar__week">
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
