import type { IStylable } from '@soldy/core'
import type { StylableDescriptor } from '@soldy/setup'
import type { EventProps, UseProps } from '../../types'

/** События слоя Stylable (core + плагины), выведены из дескриптора автоматически. */
export type StylableEventProps = EventProps<typeof StylableDescriptor>

export type StylableProps = UseProps<typeof StylableDescriptor, IStylable, StylableEventProps>
