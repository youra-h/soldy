import type { IInput } from '@soldy-ui/core'
import type { InputDescriptor } from '@soldy-ui/setup'
import type { EventProps, TDomAttributes, TFieldAttributes, UseDomProps } from '../../types'

/** События слоя Input (core + плагины), выведены из дескриптора автоматически. */
export type InputEventProps = EventProps<typeof InputDescriptor>

/** Атрибуты Input: класс и стиль — корню, остальное — полю `<input>`. */
export type InputAttributes = TDomAttributes<typeof InputDescriptor, TFieldAttributes>

export type InputProps = UseDomProps<
	typeof InputDescriptor,
	IInput,
	InputEventProps,
	TFieldAttributes
>
