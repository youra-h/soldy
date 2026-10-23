import type { IIcon } from '@soldy-ui/core'
import type { IconDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

export type IconEventProps = EventProps<typeof IconDescriptor>

export type IconProps = UseDomProps<typeof IconDescriptor, IIcon, IconEventProps>
