import type { ICollapse } from '../../types'
import type { TCollapseView } from '../../types'
import type {
	IBaseOwnerItemExtensionOptions,
	IExtension,
	IExtensionItems,
} from '../../../../base/collection'
import type { TCollapseExtension } from './collapse.extension'
import type { ICollapseItemExtension } from './item'
import type { ICollapseItem } from '../../collapse-item/types'

/**
 * Контракт расширения collapse.
 * Используется как тип TParent в TCollapseItemExtension для типизированного доступа к _parent.
 */
export interface ICollapseExtension<TItem extends ICollapseItem = ICollapseItem>
	extends IExtension<TItem>, IExtensionItems<TItem, ICollapseItemExtension<TItem>> {
	/** Внешний вид с инстанса TCollapse. */
	readonly view: TCollapseView
}

/**
 * Опции конструктора TCollapseExtension.
 * Расширяет IBaseOwnerItemExtensionOptions ссылкой на инстанс TCollapse.
 */
export interface ICollapseExtensionOptions<
	TOwner extends ICollapse = ICollapse,
	TItem extends ICollapseItem = ICollapseItem,
> extends IBaseOwnerItemExtensionOptions<TItem, ICollapseItemExtension<TItem>> {
	/** Ссылка на инстанс компонента TCollapse. */
	owner: TOwner
}

/**
 * События расширения TCollapseExtension.
 */
export type TCollapseExtensionEvents = {
	'change:view': (value: TCollapseView) => void
}

export type TCollapseExtensions<TItem extends ICollapseItem> = {
	collapse: TCollapseExtension<any, TItem>
	[key: string]: IExtension<TItem>
}
