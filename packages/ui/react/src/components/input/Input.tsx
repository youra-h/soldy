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
import { useSetupInput } from './setup.component'
import type { InputAttributes, InputProps } from './base.component'

/** Input — текстовое поле со слотами по сторонам: AGENTS.md (React), «Поля ввода». */
export function Input(props: InputProps): ReactElement | null {
	const { ctrl, ref, forwardProps, state, layer } = useSetupInput(props)
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
		name,
		disabled,
		readonly,
		required,
		placeholder,
		size,
		clearable,
		clearAria,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const trailing = clearable === true || hasSlot(props.clear) || hasSlot(props.trailing)

	return (
		<Tag {...toRootProps(ref, state, [attrs, dataset], toRootForward(forwardProps))}>
			{hasSlot(props.leading) ? (
				<div className="so-input__leading">
					{elevated(layer, renderSlot(props.leading, { ctrl }))}
				</div>
			) : null}
			<NativeInput
				type="text"
				id={id}
				name={name}
				disabled={disabled}
				readOnly={readonly}
				required={required}
				placeholder={placeholder}
				{...toAriaProps(aria)}
				{...toControlAttrs<InputAttributes>(forwardProps)}
				live={{ value }}
			/>
			{trailing ? (
				<div className="so-input__trailing">
					{elevated(layer, renderSlot(props.clear, { clear: ctrl.clear })) ??
						(clearable === true ? (
							<Button
								embedded="input.clear"
								type="button"
								className="so-input__clear"
								size={size}
								disabled={disabled}
								{...toAriaProps(clearAria)}
								ref={clear}
							>
								<Icon
									embedded="input.clear-icon"
									tag={roleIcon('close')}
									size={size}
								/>
							</Button>
						) : null)}
					{elevated(layer, renderSlot(props.trailing, { ctrl }))}
				</div>
			) : null}
		</Tag>
	)
}
