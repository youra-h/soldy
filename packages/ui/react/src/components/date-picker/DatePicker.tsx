import type { ReactElement, ReactNode } from 'react'
import { Elevate, renderSlot, roleIcon, toAriaProps, toRootProps } from '../../adapter'
import { Button } from '../button'
import { Calendar } from '../calendar'
import { DateInput } from '../date-input'
import { Frame } from '../frame'
import { Icon } from '../icon'
import { useSetupDatePicker } from './setup.component'
import type { DatePickerProps } from './base.component'

const CloseMark = roleIcon('close')
const CalendarMark = roleIcon('calendar')

/**
 * DatePicker — поле даты и календарь в панели: docs/agents/dates.md, «Даты». Ключи полей и
 * календаря — AGENTS.md (React), «Пересобранный инстанс и `key`».
 */
export function DatePicker(props: DatePickerProps): ReactElement | null {
	const {
		ctrl,
		ref,
		forwardProps,
		state,
		layer,
		rootElement,
		field,
		start,
		end,
		calendar,
		engine,
	} = useSetupDatePicker(props)

	const {
		rendered,
		id,
		attrs,
		aria,
		rootAria,
		dataset,
		mode,
		size,
		disabled,
		clearable,
		clearAria,
		openable,
		triggerAria,
		triggerDataset,
		open,
		panelAria,
		panelDataset,
		handleRendered,
		confirmable,
		confirmDisabled,
		names_start,
		names_end,
		names_cancel,
		names_confirm,
		dismiss_ownerAttribute,
	} = state

	if (!rendered) return null

	// Полю — готовыми узлами: функцию слота поле позвало бы со своей командой `clear`
	const clear: ReactNode =
		renderSlot(props.clear, { clear: ctrl.clear }) ??
		(clearable === true ? (
			<Button
				embedded="date-picker.clear"
				type="button"
				className="so-date-picker__clear"
				size={size}
				disabled={disabled}
				{...toAriaProps(clearAria)}
				onActionClick={(event) => {
					// Нативное событие: синтетический `stopPropagation` опоздал бы
					event.stopPropagation()
					ctrl.clear()
				}}
			>
				<Icon embedded="date-picker.clear-icon" tag={CloseMark} size={size} />
			</Button>
		) : null)

	const trigger = (
		<Button
			embedded="date-picker.trigger"
			type="button"
			className="so-date-picker__trigger"
			size={size}
			disabled={!openable}
			{...toAriaProps(triggerAria)}
			{...toAriaProps(triggerDataset)}
		>
			{renderSlot(props['trigger-icon']) ?? (
				<Icon embedded="date-picker.trigger-icon" tag={CalendarMark} />
			)}
		</Button>
	)

	const footer =
		confirmable === true ? (
			<>
				<Button
					embedded="date-picker.cancel"
					type="button"
					className="so-date-picker__cancel"
					size={size}
					text={names_cancel}
					onClick={() => {
						ctrl.open = false
					}}
				/>
				<Button
					embedded="date-picker.confirm"
					type="button"
					className="so-date-picker__confirm"
					size={size}
					disabled={confirmDisabled}
					text={names_confirm}
					onClick={() => ctrl.confirm()}
				/>
			</>
		) : undefined

	return (
		<div id={id} {...toRootProps(ref, state, [attrs, rootAria, dataset], forwardProps)}>
			<Elevate layer={layer}>
				{mode === 'single' ? (
					<DateInput
						key={field.uid}
						embedded="date-picker.field"
						className="so-date-picker__field"
						ctrl={field}
						aria_label={props.aria_label}
						aria_labelledBy={props.aria_labelledBy}
						aria_describedBy={props.aria_describedBy}
						{...toAriaProps(aria)}
						clear={clear}
						trailing={trigger}
					/>
				) : (
					<>
						<DateInput
							key={start.uid}
							embedded="date-picker.start"
							className="so-date-picker__start"
							ctrl={start}
							aria_label={names_start}
						/>
						<span className="so-date-picker__dash" aria-hidden="true">
							–
						</span>
						<DateInput
							key={end.uid}
							embedded="date-picker.end"
							className="so-date-picker__end"
							ctrl={end}
							aria_label={names_end}
						/>
						{clear}
						{trigger}
					</>
				)}
				<Frame
					embedded="date-picker.frame"
					className="so-date-picker__panel"
					tabIndex={-1}
					visible={open}
					position="fixed"
					anchor_anchor={rootElement}
					anchor_offset={4}
					{...toAriaProps(panelAria)}
					{...toAriaProps(panelDataset)}
					{...toAriaProps(dismiss_ownerAttribute)}
				>
					{handleRendered ? (
						<div className="so-date-picker__handle" aria-hidden="true" />
					) : null}
					<div className="so-date-picker__content">
						<Calendar
							key={calendar.uid}
							embedded="date-picker.calendar"
							className="so-date-picker__calendar"
							ctrl={calendar}
							engine={engine}
							item={props.item}
							footer={footer}
						/>
					</div>
				</Frame>
			</Elevate>
		</div>
	)
}
