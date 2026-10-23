import type { IProgressSpinner } from '@soldy-ui/core'
import type { ProgressSpinnerDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

export type ProgressSpinnerEventProps = EventProps<typeof ProgressSpinnerDescriptor>

export type ProgressSpinnerProps = UseDomProps<
	typeof ProgressSpinnerDescriptor,
	IProgressSpinner,
	ProgressSpinnerEventProps
>
