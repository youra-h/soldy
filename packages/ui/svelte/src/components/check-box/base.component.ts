import type { ICheckBox } from '@soldy-ui/core'
import type { CheckBoxDescriptor } from '@soldy-ui/setup'
import type { EventProps, TDomAttributes, TFieldAttributes, UseDomProps } from '../../types'

export type CheckBoxEventProps = EventProps<typeof CheckBoxDescriptor>

/** Атрибуты CheckBox: класс и стиль — корню, остальное — полю `<input>`. */
export type CheckBoxAttributes = TDomAttributes<
	typeof CheckBoxDescriptor,
	CheckBoxEventProps,
	TFieldAttributes
>

export type CheckBoxProps = UseDomProps<
	typeof CheckBoxDescriptor,
	ICheckBox,
	CheckBoxEventProps,
	TFieldAttributes
>
