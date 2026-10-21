import type { IMenuSubmenu } from '@soldy-ui/core'
import type {
	MenuCollectionItemDescriptor,
	MenuSubmenuCollectionDescriptor,
	MenuSubmenuDescriptor,
} from '@soldy-ui/setup'
import type { EventProps, TDomAttributes, UseDomProps } from '../../../types'

/**
 * События пункта с подменю — свои (ядро и плагины), фасада пункта (вход в
 * меню над ним) и фасада меню (свои пункты: состав, группы, `choose`).
 * Контекстов у подменю три, и колбэки всех — пропсы одного компонента.
 */
export type MenuSubmenuEventProps = EventProps<typeof MenuSubmenuDescriptor> &
	EventProps<typeof MenuCollectionItemDescriptor> &
	EventProps<typeof MenuSubmenuCollectionDescriptor>

/** Атрибуты пункта с подменю: класс и стиль — корню, остальное — строке с `role="menuitem"`. */
export type MenuSubmenuAttributes = TDomAttributes<
	typeof MenuSubmenuDescriptor,
	MenuSubmenuEventProps
>

/**
 * Пропсы пункта с подменю. Коллекционные входы его пунктов (`engine`,
 * `items`, `trackBy`, группы) отдельно не перечислены: они входят в интерфейс
 * пропсов ядра (`IMenuSubmenuProps`), и тип их несёт дескриптор подменю.
 */
export type MenuSubmenuProps = UseDomProps<
	typeof MenuSubmenuDescriptor,
	IMenuSubmenu,
	MenuSubmenuEventProps
>
