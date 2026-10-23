import type { IDateInput } from '@soldy-ui/core'
import type { DateInputDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

export type DateInputEventProps = EventProps<typeof DateInputDescriptor>

/** Пропсы DateInput: атрибуты потребителя — корню целиком, части рисует сам компонент. */
export type DateInputProps = UseDomProps<
	typeof DateInputDescriptor,
	IDateInput,
	DateInputEventProps
>
