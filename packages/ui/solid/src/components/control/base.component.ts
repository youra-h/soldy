import type { IControl } from '@soldy/core'
import type { ControlDescriptor } from '@soldy/setup'
import type { EventProps, UseProps } from '../../types'

/** События слоя Control (core + плагины), выведены из дескриптора автоматически. */
export type ControlEventProps = EventProps<typeof ControlDescriptor>

export type ControlProps = UseProps<typeof ControlDescriptor, IControl, ControlEventProps>
