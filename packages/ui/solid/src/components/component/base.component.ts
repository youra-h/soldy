import type { IComponent } from '@soldy-ui/core'
import type { ComponentDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseProps } from '../../types'

/** События слоя Component (core + плагины), выведены из дескриптора автоматически. */
export type ComponentEventProps = EventProps<typeof ComponentDescriptor>

export type ComponentProps = UseProps<typeof ComponentDescriptor, IComponent, ComponentEventProps>
