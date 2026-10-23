import type { ElementType, ReactElement, ReactNode } from 'react'
import {
	NativeInput,
	elevated,
	renderSlot,
	roleIcon,
	toAriaProps,
	toControlAttrs,
	toRootForward,
	toRootProps,
} from '../../adapter'
import { useSetupCheckBox } from './setup.component'
import type { CheckBoxAttributes, CheckBoxProps } from './base.component'

/** Отметка — `svg` роли, а не `Icon`: тот собирал бы контекст на каждую смену отметки. */
const CheckMark = roleIcon('check')
const IndeterminateMark = roleIcon('checkIndeterminate')

/** CheckBox — флажок на нативном `<input type="checkbox">`: AGENTS.md (React), «Поля ввода». */
export function CheckBox(props: CheckBoxProps): ReactElement | null {
	const { ref, forwardProps, state, layer } = useSetupCheckBox(props)

	const {
		rendered,
		tag,
		attrs,
		aria,
		dataset,
		id,
		value,
		indeterminate,
		name,
		disabled,
		required,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const scope = { value, indeterminate: indeterminate ?? false }

	// «Выбрано частично» — поверх значения: его снимает клик (`toggle`), а не смена `value`
	let mark: ReactNode = null

	if (indeterminate) {
		mark = elevated(layer, renderSlot(props['indeterminate-icon'], scope)) ?? (
			<IndeterminateMark className="so-check-box__mark" />
		)
	} else if (value) {
		mark = elevated(layer, renderSlot(props.icon, scope)) ?? (
			<CheckMark className="so-check-box__mark" />
		)
	}

	return (
		<Tag {...toRootProps(ref, state, [attrs, dataset], toRootForward(forwardProps))}>
			<NativeInput
				type="checkbox"
				id={id}
				name={name}
				disabled={disabled}
				required={required}
				{...toAriaProps(aria)}
				{...toControlAttrs<CheckBoxAttributes>(forwardProps)}
				live={{ checked: value, indeterminate }}
			/>
			<span className="so-check-box__container" aria-hidden="true">
				{mark}
			</span>
		</Tag>
	)
}
