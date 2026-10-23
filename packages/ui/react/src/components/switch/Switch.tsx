import type { ElementType, ReactElement } from 'react'
import {
	NativeInput,
	elevated,
	renderSlot,
	toAriaProps,
	toControlAttrs,
	toRootForward,
	toRootProps,
} from '../../adapter'
import { useSetupSwitch } from './setup.component'
import type { SwitchAttributes, SwitchProps } from './base.component'

/** Switch — переключатель на нативном флажке: AGENTS.md (React), «Поля ввода». */
export function Switch(props: SwitchProps): ReactElement | null {
	const { ctrl, ref, forwardProps, state, layer } = useSetupSwitch(props)

	const { rendered, tag, attrs, aria, dataset, id, value, name, disabled, required } = state

	if (!rendered) return null

	const Tag = tag as ElementType
	const scope = { value, ctrl }

	return (
		<Tag {...toRootProps(ref, state, [attrs, dataset], toRootForward(forwardProps))}>
			<NativeInput
				type="checkbox"
				id={id}
				name={name}
				disabled={disabled}
				required={required}
				{...toAriaProps(aria)}
				{...toControlAttrs<SwitchAttributes>(forwardProps)}
				live={{ checked: value }}
			/>
			<span className="so-switch__track" aria-hidden="true">
				<span className="so-switch__track--thumb">
					{elevated(
						layer,
						value ? renderSlot(props.on, scope) : renderSlot(props.off, scope),
					)}
				</span>
			</span>
		</Tag>
	)
}
