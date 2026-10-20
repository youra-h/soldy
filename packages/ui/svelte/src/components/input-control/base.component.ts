import type { IInputControl } from '@soldy-ui/core'
import type { InputControlDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseProps } from '../../types'

/** События слоя InputControl (core + плагины), выведены из дескриптора автоматически. */
export type InputControlEventProps = EventProps<typeof InputControlDescriptor>

/**
 * Пропсы слоя InputControl — поля формы с `readonly`, `required` и `id`. Тип
 * значения у слоя не задан: его сужает наследник — поле ввода текстом, оценка
 * числом.
 */
export type InputControlProps = UseProps<
	typeof InputControlDescriptor,
	IInputControl<unknown>,
	InputControlEventProps
>
