import type { IValueControl } from '@soldy-ui/core'
import type { ValueControlDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseProps } from '../../types'

export type ValueControlEventProps = EventProps<typeof ValueControlDescriptor>

/** Тип значения сужает наследник. */
export type ValueControlProps = UseProps<
	typeof ValueControlDescriptor,
	IValueControl<unknown>,
	ValueControlEventProps
>
