import type { IDateInput } from '@soldy-ui/core'
import type { DateInputDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События слоя DateInput (core + плагины), выведены из дескриптора автоматически. */
export type DateInputEventProps = EventProps<typeof DateInputDescriptor>

/**
 * Пропсы DateInput. Атрибуты потребителя — корню целиком, как у Vue: поля
 * ввода, между которым их делить, у даты нет — части рисует сам компонент.
 */
export type DateInputProps = UseDomProps<
	typeof DateInputDescriptor,
	IDateInput,
	DateInputEventProps
>
