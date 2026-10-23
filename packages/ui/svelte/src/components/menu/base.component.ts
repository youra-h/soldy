import type { IMenu } from '@soldy-ui/core'
import type { MenuCollectionDescriptor, MenuDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

export type MenuEventProps = EventProps<typeof MenuDescriptor> &
	EventProps<typeof MenuCollectionDescriptor>

/** Атрибуты — обёртке триггера, как у Popover: ARIA меню — у панели. */
export type MenuProps = UseDomProps<typeof MenuDescriptor, IMenu, MenuEventProps>
