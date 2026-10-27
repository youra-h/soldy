import type { ElementType, ReactElement } from 'react'
import {
	NativeInput,
	elevated,
	hasSlot,
	renderSlot,
	roleIcon,
	toAriaProps,
	toControlAttrs,
	toRootForward,
	toRootProps,
	useClickAction,
} from '../../adapter'
import { Button } from '../button'
import { Icon } from '../icon'
import { useSetupNumberInput } from './setup.component'
import type { NumberInputAttributes, NumberInputProps } from './base.component'

const CloseMark = roleIcon('close')
const MinusMark = roleIcon('minus')
const PlusMark = roleIcon('plus')

/** NumberInput — поле числа с кнопками шага: docs/agents/patterns.md, «Готовые паттерны». */
export function NumberInput(props: NumberInputProps): ReactElement | null {
	const { ctrl, ref, forwardProps, state, layer } = useSetupNumberInput(props)
	const clear = useClickAction((event) => {
		// Stopped at the button: the root of a select-only Select would open the panel
		event.stopPropagation()
		ctrl.clear()
	})

	const {
		rendered,
		tag,
		attrs,
		aria,
		dataset,
		id,
		value,
		text,
		name,
		disabled,
		readonly,
		required,
		placeholder,
		size,
		clearable,
		clearAria,
		inputAttrs,
		inputAria,
		decrementDisabled,
		incrementDisabled,
		decrementAria,
		incrementAria,
		decrementDataset,
		incrementDataset,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const trailing = clearable === true || hasSlot(props.clear) || hasSlot(props.trailing)

	return (
		<Tag {...toRootProps(ref, state, [attrs, dataset], toRootForward(forwardProps))}>
			{hasSlot(props.leading) ? (
				<div className="so-number-input__leading">
					{elevated(layer, renderSlot(props.leading, { ctrl }))}
				</div>
			) : null}
			<NativeInput
				type="text"
				className="so-number-input__input"
				id={id}
				placeholder={placeholder}
				disabled={disabled}
				readOnly={readonly}
				required={required}
				autoComplete="off"
				spellCheck={false}
				{...toAriaProps(inputAttrs)}
				{...toAriaProps(aria)}
				{...toAriaProps(inputAria)}
				{...toControlAttrs<NumberInputAttributes>(forwardProps)}
				live={{ value: text }}
			/>
			{trailing ? (
				<div className="so-number-input__trailing">
					{elevated(layer, renderSlot(props.clear, { clear: ctrl.clear })) ??
						(clearable === true ? (
							<Button
								embedded="number-input.clear"
								type="button"
								className="so-number-input__clear"
								size={size}
								disabled={disabled}
								{...toAriaProps(clearAria)}
								ref={clear}
							>
								<Icon
									embedded="number-input.clear-icon"
									tag={CloseMark}
									size={size}
								/>
							</Button>
						) : null)}
					{elevated(layer, renderSlot(props.trailing, { ctrl }))}
				</div>
			) : null}
			<div className="so-number-input__stepper">
				<Button
					embedded="number-input.decrement"
					type="button"
					className="so-number-input__decrement"
					size={size}
					disabled={decrementDisabled}
					{...toAriaProps(decrementAria)}
					{...toAriaProps(decrementDataset)}
				>
					{elevated(layer, renderSlot(props['decrement-icon'])) ?? (
						<Icon embedded="number-input.decrement-icon" tag={MinusMark} size={size} />
					)}
				</Button>
				<Button
					embedded="number-input.increment"
					type="button"
					className="so-number-input__increment"
					size={size}
					disabled={incrementDisabled}
					{...toAriaProps(incrementAria)}
					{...toAriaProps(incrementDataset)}
				>
					{elevated(layer, renderSlot(props['increment-icon'])) ?? (
						<Icon embedded="number-input.increment-icon" tag={PlusMark} size={size} />
					)}
				</Button>
			</div>
			<input
				type="hidden"
				name={name}
				// '', а не `undefined`: иначе смена числом сделала бы поле управляемым
				value={value === undefined ? '' : String(value)}
				disabled={disabled}
			/>
		</Tag>
	)
}
