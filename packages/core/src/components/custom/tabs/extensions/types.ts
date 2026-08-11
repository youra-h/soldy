import type { ITabs } from '../types'
import type { IBaseOwnerItemExtensionOptions } from '../../../base/collection/extension'
import type { ITabItemExtension } from './item'
import type { ITabItem } from '../tab-item/types'

/**
 * Опции конструктора TTabsExtension.
 * Расширяет IBaseOwnerItemExtensionOptions ссылкой на инстанс TTabs.
 */
export interface ITabsExtensionOptions<
	TOwner extends ITabs = ITabs,
	TItem extends ITabItem = ITabItem,
> extends IBaseOwnerItemExtensionOptions<TItem, ITabItemExtension<TItem>> {
	/** Ссылка на инстанс компонента TTabs. */
	owner: TOwner
}

/**
 * События расширения TTabsExtension.
 */
export type TTabsExtensionEvents = Record<string, never>
