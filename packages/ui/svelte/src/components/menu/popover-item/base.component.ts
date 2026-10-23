import type { IMenuPopoverItem } from '@soldy-ui/core'
import type { MenuCollectionItemDescriptor, MenuPopoverItemDescriptor } from '@soldy-ui/setup'
import type { EventProps, TDomAttributes, UseDomProps } from '../../../types'

export type MenuPopoverItemEventProps = EventProps<typeof MenuPopoverItemDescriptor> &
	EventProps<typeof MenuCollectionItemDescriptor>

/** Атрибуты пункта с панелью: класс и стиль — корню, остальное — строке с `role="menuitem"`. */
export type MenuPopoverItemAttributes = TDomAttributes<
	typeof MenuPopoverItemDescriptor,
	MenuPopoverItemEventProps
>

export type MenuPopoverItemProps = UseDomProps<
	typeof MenuPopoverItemDescriptor,
	IMenuPopoverItem,
	MenuPopoverItemEventProps
>
