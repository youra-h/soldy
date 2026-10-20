import type { IInputControl } from '@soldy-ui/core'
import type { InputControlDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseProps } from '../../types'

/** События слоя InputControl (core + плагины), выведены из дескриптора автоматически. */
export type InputControlEventProps = EventProps<typeof InputControlDescriptor>

/**
 * Пропсы слоя InputControl. Тип значения у базы не известен: его задаёт
 * наследник (текст у Input, отметка у CheckBox, число у Rating).
 */
export type InputControlProps = UseProps<
	typeof InputControlDescriptor,
	IInputControl<unknown>,
	InputControlEventProps
>
