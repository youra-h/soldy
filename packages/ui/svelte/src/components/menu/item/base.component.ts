import type { IMenuItem } from '@soldy-ui/core'
import type { MenuCollectionItemDescriptor, MenuItemDescriptor } from '@soldy-ui/setup'
import type { EventProps, TDomAttributes, UseDomProps } from '../../../types'

export type MenuItemEventProps = EventProps<typeof MenuItemDescriptor> &
	EventProps<typeof MenuCollectionItemDescriptor>

/** Атрибуты пункта: класс и стиль — корню, остальное — строке с `role="menuitem"`. */
export type MenuItemAttributes = TDomAttributes<typeof MenuItemDescriptor, MenuItemEventProps>

/** Размер диктует меню, вариант — свой. */
export type MenuItemProps = UseDomProps<typeof MenuItemDescriptor, IMenuItem, MenuItemEventProps>
