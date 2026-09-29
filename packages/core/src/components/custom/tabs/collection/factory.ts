import { TTabsExtension, TTabsContentExtension } from './extensions'
import { activationExtensions } from './../../../base/collection/create/internal'
import type { TExtensionSet } from './../../../base/collection/create/internal'
import TTabsItem from './../item/item.class'
import type { ITabsItem } from './../item/types'
import type { ITabs } from './../types'

/**
 * Детали рабочей коллекции Tabs — по порядку установки.
 *
 * Набор один: `completeEngine` ставит из него то, чего в движке нет, — в
 * пришедший снаружи на любом уровне и в новый одинаково. Без владельца его
 * деталей в наборе нет.
 */
export function tabsExtensions(owner?: ITabs): TExtensionSet<ITabsItem> {
	const set: TExtensionSet<ITabsItem> = {
		...activationExtensions<ITabsItem>(TTabsItem),
		content: () => new TTabsContentExtension<ITabsItem>(),
	}

	if (owner) set.tabs = () => new TTabsExtension({ owner })

	return set
}
