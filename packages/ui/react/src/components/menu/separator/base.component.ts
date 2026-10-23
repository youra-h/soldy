import type { TMenuSeparator } from '@soldy-ui/core'
import type { MenuSeparatorDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../../types'

export type MenuSeparatorEventProps = EventProps<typeof MenuSeparatorDescriptor>

export type MenuSeparatorProps = UseDomProps<
	typeof MenuSeparatorDescriptor,
	TMenuSeparator,
	MenuSeparatorEventProps
>
