import type { ElementType, ReactElement } from 'react'
import type { TDateInputSegment } from '@soldy-ui/core'
import {
	elevated,
	hasSlot,
	renderSlot,
	roleIcon,
	toAriaProps,
	toRootProps,
	useClickAction,
} from '../../adapter'
import { Button } from '../button'
import { Icon } from '../icon'
import { useSetupDateInput } from './setup.component'
import type { DateInputProps } from './base.component'

const CloseMark = roleIcon('close')

/**
 * Часть или разделитель; ключ части — её тип, и при наборе узел тот же. Текст — единственный
 * ребёнок-строка: docs/agents/dates.md, «Даты».
 */
function drawSegment(segment: TDateInputSegment): ReactElement {
	if (segment.type === 'literal') {
		return (
			<span
				key={segment.key}
				className="so-date-input__literal"
				{...toAriaProps(segment.aria)}
			>
				{segment.text}
			</span>
		)
	}

	return (
		<span
			key={segment.key}
			className="so-date-input__segment"
			suppressContentEditableWarning
			{...toAriaProps(segment.attrs)}
			{...toAriaProps(segment.aria)}
			{...toAriaProps(segment.dataset)}
		>
			{segment.text}
		</span>
	)
}

/** DateInput — поле даты из частей по формату локали: docs/agents/dates.md, «Даты». */
export function DateInput(props: DateInputProps): ReactElement | null {
	const { ctrl, ref, forwardProps, state, layer } = useSetupDateInput(props)
	const clear = useClickAction((event) => {
		// Stopped at the button: the root of a select-only Select would open the panel
		event.stopPropagation()
		ctrl.clear()
	})

	const {
		rendered,
		tag,
		id,
		attrs,
		aria,
		dataset,
		segments,
		segmentsAttrs,
		name,
		value,
		disabled,
		size,
		clearable,
		clearAria,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const trailing = clearable === true || hasSlot(props.clear) || hasSlot(props.trailing)

	return (
		<Tag id={id} {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)}>
			{hasSlot(props.leading) ? (
				<div className="so-date-input__leading">
					{elevated(layer, renderSlot(props.leading, { ctrl }))}
				</div>
			) : null}
			<span className="so-date-input__segments" {...toAriaProps(segmentsAttrs)}>
				{segments?.map(drawSegment)}
			</span>
			{trailing ? (
				<div className="so-date-input__trailing">
					{elevated(layer, renderSlot(props.clear, { clear: ctrl.clear })) ??
						(clearable === true ? (
							<Button
								embedded="date-input.clear"
								type="button"
								className="so-date-input__clear"
								size={size}
								disabled={disabled}
								{...toAriaProps(clearAria)}
								ref={clear}
							>
								<Icon
									embedded="date-input.clear-icon"
									tag={CloseMark}
									size={size}
								/>
							</Button>
						) : null)}
					{elevated(layer, renderSlot(props.trailing, { ctrl }))}
				</div>
			) : null}
			<input type="hidden" name={name} value={value ?? ''} disabled={disabled} />
		</Tag>
	)
}
