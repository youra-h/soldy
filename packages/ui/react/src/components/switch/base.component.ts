import type { ISwitch } from '@soldy-ui/core'
import type { SwitchDescriptor } from '@soldy-ui/setup'
import type { EventProps, TDomAttributes, TFieldAttributes, UseDomProps } from '../../types'

export type SwitchEventProps = EventProps<typeof SwitchDescriptor>

/** Атрибуты Switch: класс и стиль — корню, остальное — полю `<input>`. */
export type SwitchAttributes = TDomAttributes<typeof SwitchDescriptor, TFieldAttributes>

export type SwitchProps = UseDomProps<
	typeof SwitchDescriptor,
	ISwitch,
	SwitchEventProps,
	TFieldAttributes
>
