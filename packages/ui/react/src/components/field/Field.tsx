import type { ElementType, ReactElement } from 'react'
import { Elevate, renderSlot, roleIcon, toAriaProps, toRootProps } from '../../adapter'
import { Icon } from '../icon'
import { useSetupField } from './setup.component'
import type { FieldProps } from './base.component'

/** Значок ошибки — компонент на роль: `tag` у Icon — корень, а не роль. */
const ErrorGlyph = roleIcon('error')

/** Field — поле формы вокруг контрола: docs/agents/patterns.md, «Готовые паттерны». */
export function Field(props: FieldProps): ReactElement | null {
	const { ref, forwardProps, state, layer } = useSetupField(props)

	const {
		rendered,
		tag,
		label,
		helper,
		error,
		helperRendered,
		errorRendered,
		labelAria,
		helperAria,
		errorAria,
		attrs,
		aria,
		dataset,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType

	return (
		<Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)}>
			<Elevate layer={layer}>
				{label ? (
					<label className="so-field__label" {...toAriaProps(labelAria)}>
						{renderSlot(props['label-content']) ?? label}
					</label>
				) : null}
				<div className="so-field__control">{renderSlot(props.children)}</div>
				{helperRendered ? (
					<div className="so-field__helper" {...toAriaProps(helperAria)}>
						{renderSlot(props['helper-content']) ?? helper}
					</div>
				) : null}
				{errorRendered ? (
					<div className="so-field__error" {...toAriaProps(errorAria)}>
						<Icon
							embedded="field.error-icon"
							className="so-field__error-icon"
							tag={ErrorGlyph}
						/>
						<div className="so-field__error-text">
							{renderSlot(props['error-content']) ?? error}
						</div>
					</div>
				) : null}
			</Elevate>
		</Tag>
	)
}
