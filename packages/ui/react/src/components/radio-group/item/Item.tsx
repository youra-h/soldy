import type { ElementType, ReactElement } from 'react'
import {
	NativeInput,
	renderSlot,
	toAriaProps,
	toControlAttrs,
	toRootForward,
	toRootProps,
	withRenderBoundary,
} from '../../../adapter'
import { useSetupRadioGroupItem } from './setup.component'
import type { RadioGroupItemAttributes, RadioGroupItemProps } from './base.component'

/** RadioGroupItem — радио на нативном `<input type="radio">`: AGENTS.md (React), «Поля ввода». */
export const RadioGroupItem = withRenderBoundary(function RadioGroupItem(
	props: RadioGroupItemProps,
): ReactElement | null {
	const { ref, forwardProps, state, context } = useSetupRadioGroupItem(props)

	const { rendered, tag, name, value, disabled, active, aria, dataset, attrs } = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const { onChange, ...control } = toControlAttrs<RadioGroupItemAttributes>(forwardProps)

	return (
		<Tag {...toRootProps(ref, state, [dataset, attrs], toRootForward(forwardProps))}>
			<NativeInput
				className="so-radio-group-item__input"
				type="radio"
				name={name}
				value={value}
				disabled={disabled}
				{...toAriaProps(aria)}
				{...control}
				onChange={(event) => {
					// Браузер уже отметил радио: коллекция делает его активным, затем — потребитель
					if (context) context.adapters.activation.active = true
					onChange?.(event)
				}}
				live={{ checked: active }}
			/>
			<span className="so-radio-group-item__control">
				<span className="so-radio-group-item__indicator" />
			</span>
			<span className="so-radio-group-item__text">
				{renderSlot(props.children, { active: active ?? false })}
			</span>
		</Tag>
	)
})
