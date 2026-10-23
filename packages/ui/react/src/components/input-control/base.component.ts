import type { IInputControl } from '@soldy-ui/core'
import type { InputControlDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseProps } from '../../types'

export type InputControlEventProps = EventProps<typeof InputControlDescriptor>

/** Тип значения задаёт наследник. */
export type InputControlProps = UseProps<
	typeof InputControlDescriptor,
	IInputControl<unknown>,
	InputControlEventProps
>
