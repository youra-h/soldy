import { TTabsExtension } from './extensions'
import { activationExtensions } from './../../../base/collection/create/internal'
import type { TExtensionSet } from './../../../base/collection/create/internal'
import TTabsItem from './../item/item.class'
import type { ITabsItem } from './../item/types'

/**
 * Детали рабочей коллекции Tabs — по порядку установки.
 *
 * Набор один: `completeEngine` ставит из него то, чего в движке нет, — в
 * пришедший снаружи на любом уровне и в новый одинаково. Владельца детали не
 * получают: он опция движка (`engine.options.set({ owner })`).
 */
export function tabsExtensions(): TExtensionSet<ITabsItem> {
	return {
		...activationExtensions<ITabsItem>(TTabsItem),
		tabs: () => new TTabsExtension(),
	}
}
