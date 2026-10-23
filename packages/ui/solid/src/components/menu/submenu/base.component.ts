import type { IMenuSubmenu } from '@soldy-ui/core'
import type {
	MenuCollectionItemDescriptor,
	MenuSubmenuCollectionDescriptor,
	MenuSubmenuDescriptor,
} from '@soldy-ui/setup'
import type { EventProps, TDomAttributes, UseDomProps } from '../../../types'

/** События подменю — свои, фасада пункта и фасада меню своих пунктов. */
export type MenuSubmenuEventProps = EventProps<typeof MenuSubmenuDescriptor> &
	EventProps<typeof MenuCollectionItemDescriptor> &
	EventProps<typeof MenuSubmenuCollectionDescriptor>

/** Атрибуты пункта с подменю: класс и стиль — корню, остальное — строке с `role="menuitem"`. */
export type MenuSubmenuAttributes = TDomAttributes<
	typeof MenuSubmenuDescriptor,
	MenuSubmenuEventProps
>

/** Пропсы подменю; коллекционные входы его пунктов несёт интерфейс ядра. */
export type MenuSubmenuProps = UseDomProps<
	typeof MenuSubmenuDescriptor,
	IMenuSubmenu,
	MenuSubmenuEventProps
>
