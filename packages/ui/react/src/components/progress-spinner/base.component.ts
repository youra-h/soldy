import type { IProgressSpinner } from '@soldy-ui/core'
import type { ProgressSpinnerDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События слоя ProgressSpinner (core + плагины), выведены из дескриптора автоматически. */
export type ProgressSpinnerEventProps = EventProps<typeof ProgressSpinnerDescriptor>

export type ProgressSpinnerProps = UseDomProps<
	typeof ProgressSpinnerDescriptor,
	IProgressSpinner,
	ProgressSpinnerEventProps
>
