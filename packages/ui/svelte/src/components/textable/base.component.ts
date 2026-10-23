import type { ITextable } from '@soldy-ui/core'
import type { TextableDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseProps } from '../../types'

export type TextableEventProps = EventProps<typeof TextableDescriptor>

export type TextableProps = UseProps<typeof TextableDescriptor, ITextable, TextableEventProps>
