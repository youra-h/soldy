import type { IStylable } from '@soldy-ui/core'
import type { StylableDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseProps } from '../../types'

/** События слоя Stylable (core + плагины), выведены из дескриптора автоматически. */
export type StylableEventProps = EventProps<typeof StylableDescriptor>

export type StylableProps = UseProps<typeof StylableDescriptor, IStylable, StylableEventProps>
