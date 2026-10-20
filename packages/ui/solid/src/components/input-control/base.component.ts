import type { IInputControl } from '@soldy-ui/core'
import type { InputControlDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseProps } from '../../types'

/** События слоя InputControl (core + плагины), выведены из дескриптора автоматически. */
export type InputControlEventProps = EventProps<typeof InputControlDescriptor>

/** Значение слоя — любого типа: число у оценки, строка у поля. */
export type InputControlProps = UseProps<
	typeof InputControlDescriptor,
	IInputControl<unknown>,
	InputControlEventProps
>
