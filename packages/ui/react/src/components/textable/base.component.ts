import type { ITextable } from '@soldy/core'
import type { TextableDescriptor } from '@soldy/setup'
import type { EventProps, UseProps } from '../../types'

/** События слоя Textable (core + плагины), выведены из дескриптора автоматически. */
export type TextableEventProps = EventProps<typeof TextableDescriptor>

export type TextableProps = UseProps<typeof TextableDescriptor, ITextable, TextableEventProps>
