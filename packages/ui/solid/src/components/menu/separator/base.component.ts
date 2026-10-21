import type { TMenuSeparator } from '@soldy-ui/core'
import type { MenuSeparatorDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../../types'

/** События разделителя — свои (ядро и плагины). */
export type MenuSeparatorEventProps = EventProps<typeof MenuSeparatorDescriptor>

/** Пропсы разделителя меню: своих пропсов у него нет, роль `separator` пишет ядро. */
export type MenuSeparatorProps = UseDomProps<
	typeof MenuSeparatorDescriptor,
	TMenuSeparator,
	MenuSeparatorEventProps
>
