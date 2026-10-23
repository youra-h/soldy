import type { IMenuRadioGroup } from '@soldy-ui/core'
import type { MenuRadioGroupDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../../types'

export type MenuRadioGroupEventProps = EventProps<typeof MenuRadioGroupDescriptor>

export type MenuRadioGroupProps = UseDomProps<
	typeof MenuRadioGroupDescriptor,
	IMenuRadioGroup,
	MenuRadioGroupEventProps
>
