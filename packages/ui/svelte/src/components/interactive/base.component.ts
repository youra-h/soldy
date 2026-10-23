import type { IInteractive } from '@soldy-ui/core'
import type { InteractiveDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseProps } from '../../types'

export type InteractiveEventProps = EventProps<typeof InteractiveDescriptor>

export type InteractiveProps = UseProps<
	typeof InteractiveDescriptor,
	IInteractive,
	InteractiveEventProps
>
