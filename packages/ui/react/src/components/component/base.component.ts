import type { IComponent } from '@soldy/core'
import type { ComponentDescriptor } from '@soldy/setup'
import type { EventProps, UseProps } from '../../types'

/** События слоя Component (core + плагины), выведены из дескриптора автоматически. */
export type TComponentEventProps = EventProps<typeof ComponentDescriptor>

export type ComponentProps = UseProps<typeof ComponentDescriptor, IComponent, TComponentEventProps>
