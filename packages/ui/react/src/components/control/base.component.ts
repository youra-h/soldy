import type { IControl } from '@soldy-ui/core'
import type { ControlDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseProps } from '../../types'

export type ControlEventProps = EventProps<typeof ControlDescriptor>

export type ControlProps = UseProps<typeof ControlDescriptor, IControl, ControlEventProps>
