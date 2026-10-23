import type { IItemGroup } from '@soldy-ui/core'
import type { SelectGroupDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../../types'

export type SelectGroupEventProps = EventProps<typeof SelectGroupDescriptor>

export type SelectGroupProps = UseDomProps<
	typeof SelectGroupDescriptor,
	IItemGroup,
	SelectGroupEventProps
>
