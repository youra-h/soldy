import type { IInteractive } from '@soldy-ui/core'
import type { InteractiveDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseProps } from '../../types'

/** События слоя Interactive (core + плагины), выведены из дескриптора автоматически. */
export type InteractiveEventProps = EventProps<typeof InteractiveDescriptor>

export type InteractiveProps = UseProps<
	typeof InteractiveDescriptor,
	IInteractive,
	InteractiveEventProps
>
