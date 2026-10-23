import type { IFrame } from '@soldy-ui/core'
import type { FrameDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События Frame (ядро и плагины). */
export type FrameEventProps = EventProps<typeof FrameDescriptor>

export type FrameProps = UseDomProps<typeof FrameDescriptor, IFrame, FrameEventProps>
