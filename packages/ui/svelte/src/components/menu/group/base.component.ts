import type { IItemGroup } from '@soldy-ui/core'
import type { MenuGroupDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../../types'

export type MenuGroupEventProps = EventProps<typeof MenuGroupDescriptor>

export type MenuGroupProps = UseDomProps<
	typeof MenuGroupDescriptor,
	IItemGroup,
	MenuGroupEventProps
>
