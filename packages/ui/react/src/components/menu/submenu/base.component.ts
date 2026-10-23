import type { HTMLAttributes } from 'react'
import type { IMenuSubmenu } from '@soldy-ui/core'
import type {
	MenuCollectionItemDescriptor,
	MenuSubmenuCollectionDescriptor,
	MenuSubmenuDescriptor,
} from '@soldy-ui/setup'
import type { EventProps, TDomAttributes, UseDomProps } from '../../../types'

/** Колбэки трёх контекстов подменю — свой, фасад пункта и фасад меню — пропсы одного компонента. */
export type MenuSubmenuEventProps = EventProps<typeof MenuSubmenuDescriptor> &
	EventProps<typeof MenuCollectionItemDescriptor> &
	EventProps<typeof MenuSubmenuCollectionDescriptor>

/** Атрибуты пункта с подменю: класс и стиль — корню, остальное — строке с `role="menuitem"`. */
export type MenuSubmenuAttributes = TDomAttributes<
	typeof MenuSubmenuDescriptor,
	HTMLAttributes<HTMLElement>,
	MenuSubmenuEventProps
>

export type MenuSubmenuProps = UseDomProps<
	typeof MenuSubmenuDescriptor,
	IMenuSubmenu,
	MenuSubmenuEventProps
>
