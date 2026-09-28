import { TTabsExtension, TTabsContentExtension } from './extensions'
import { activationExtensions } from './../../../base/collection/create/internal'
import type { TExtensionSet } from './../../../base/collection/create/internal'
import TTabsItem from './../item/item.class'
import type { ITabsItem } from './../item/types'
import type { ITabs } from './../types'

/**
 * Расширения коллекции Tabs — всё, без чего компонент не работает.
 * Пришедший снаружи движок компонент дособирает этим набором.
 */
export const TABS_EXTENSIONS = (): TExtensionSet<ITabsItem, ITabs> => ({
	...activationExtensions<ITabsItem>(TTabsItem),
	content: () => new TTabsContentExtension<ITabsItem>(),
	tabs: (owner) => new TTabsExtension({ owner }),
})
