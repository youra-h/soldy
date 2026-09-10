import { TTabsCollection } from './types'
import { TTabsExtension, TTabsContentExtension } from './extensions'
import { activationExtensions, assembleEngine } from './../../../base/collection/create/internal'
import type { TExtensionSet, TOwnerExtensionSet } from './../../../base/collection/create/internal'
import TTabsItem from './../item/item.class'
import type { ITabsItem } from './../item/types'
import type { ITabs } from './../types'

/**
 * Состав коллекции Tabs — объявлением, а не функцией сборки.
 *
 * Разделён надвое, потому что владелец есть не всегда: коллекцию можно собрать
 * снаружи (`createEngine`) и передать компоненту, а инстанс `TTabs` появится
 * только там. Из этих же наборов вычисляется, чего движку не хватает, — без
 * второго списка, который однажды разъедется с первым.
 */
export const TABS_EXTENSIONS = (): TExtensionSet<ITabsItem> => ({
	...activationExtensions<ITabsItem>(TTabsItem as unknown as new (source: any) => ITabsItem),
	content: () => new TTabsContentExtension<ITabsItem>(),
})

/** То, чему нужен инстанс компонента. */
export const TABS_OWNER_EXTENSIONS: TOwnerExtensionSet<ITabsItem, ITabs> = {
	tabs: (owner) => new TTabsExtension({ owner }) as never,
}

/**
 * Полная коллекция Tabs. Внутренняя: наружу ведёт `createEngineTabs`, который
 * требует владельца явно.
 */
export const TabsFactory = (owner: ITabs): TTabsCollection => {
	const engine = assembleEngine<ITabsItem, any>(TABS_EXTENSIONS())

	for (const build of Object.values(TABS_OWNER_EXTENSIONS)) engine.use(build(owner))

	return engine as TTabsCollection
}
