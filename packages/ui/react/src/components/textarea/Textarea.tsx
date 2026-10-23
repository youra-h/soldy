import type { ElementType, ReactElement } from 'react'
import {
	NativeTextarea,
	toAriaProps,
	toControlAttrs,
	toRootForward,
	toRootProps,
} from '../../adapter'
import { useSetupTextarea } from './setup.component'
import type { TextareaAttributes, TextareaProps } from './base.component'

/** Textarea — многострочное поле со счётчиком символов: AGENTS.md (React), «Поля ввода». */
export function Textarea(props: TextareaProps): ReactElement | null {
	const { ref, forwardProps, state } = useSetupTextarea(props)

	const {
		rendered,
		tag,
		attrs,
		aria,
		dataset,
		id,
		value,
		name,
		rows,
		maxlength,
		disabled,
		readonly,
		required,
		placeholder,
		counter,
		counterAria,
		names_counter,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType

	return (
		<Tag {...toRootProps(ref, state, [attrs, dataset], toRootForward(forwardProps))}>
			<NativeTextarea
				id={id}
				name={name}
				rows={rows}
				maxLength={maxlength}
				disabled={disabled}
				readOnly={readonly}
				required={required}
				placeholder={placeholder}
				{...toAriaProps(aria)}
				{...toControlAttrs<TextareaAttributes>(forwardProps)}
				text={value}
			/>
			{counter === true ? (
				<div className="so-textarea__counter" {...toAriaProps(counterAria)}>
					{names_counter}
				</div>
			) : null}
		</Tag>
	)
}
