import type { IDateInput } from '@soldy-ui/core'
import type { DateInputDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

export type DateInputEventProps = EventProps<typeof DateInputDescriptor>

/** Атрибуты — корню целиком: поля ввода, с которым их делить, нет. */
export type DateInputProps = UseDomProps<
	typeof DateInputDescriptor,
	IDateInput,
	DateInputEventProps
>
