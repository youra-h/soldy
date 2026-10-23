import type { INumberInput } from '@soldy-ui/core'
import type { NumberInputDescriptor } from '@soldy-ui/setup'
import type { EventProps, TDomAttributes, TFieldAttributes, UseDomProps } from '../../types'

export type NumberInputEventProps = EventProps<typeof NumberInputDescriptor>

/** Атрибуты NumberInput: класс и стиль — корню, остальное — вводу `<input>`. */
export type NumberInputAttributes = TDomAttributes<typeof NumberInputDescriptor, TFieldAttributes>

export type NumberInputProps = UseDomProps<
	typeof NumberInputDescriptor,
	INumberInput,
	NumberInputEventProps,
	TFieldAttributes
>
