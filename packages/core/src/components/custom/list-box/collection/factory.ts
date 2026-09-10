import { TListBoxCollection } from './types'
import { TListBoxExtension } from './extensions'
import { TValueSelectionExtension } from './../../../base'
import { selectionExtensions, assembleEngine } from './../../../base/collection/create/internal'
import type { TExtensionSet, TOwnerExtensionSet } from './../../../base/collection/create/internal'
import TListBoxItem from './../item/item.class'
import type { IListBoxItem } from './../item/types'
import type { IListBox } from './../types'

/**
 * Состав коллекции ListBox — объявлением, а не функцией сборки.
 *
 * Разделён надвое, потому что владелец есть не всегда: коллекцию можно собрать
 * снаружи (`createEngine`) и передать компоненту, а инстанс `TListBox` появится
 * только там. Из этих же наборов вычисляется, чего движку не хватает.
 */
export const LIST_BOX_EXTENSIONS = (): TExtensionSet<IListBoxItem> => ({
	...selectionExtensions<IListBoxItem>(
		TListBoxItem as unknown as new (source: any) => IListBoxItem,
	),
})

/** То, чему нужен инстанс компонента. */
export const LIST_BOX_OWNER_EXTENSIONS: TOwnerExtensionSet<IListBoxItem, IListBox> = {
	// Связь `value` ↔ выбор. Без неё проп `value` у ListBox был бы объявлен,
	// но мёртв
	value: (owner) => new TValueSelectionExtension({ owner }) as never,
	list: (owner) => new TListBoxExtension({ owner }) as never,
}

/**
 * Полная коллекция ListBox. Внутренняя: наружу ведёт `createEngineListBox`,
 * который требует владельца явно.
 */
export const ListBoxFactory = (owner: IListBox): TListBoxCollection => {
	const engine = assembleEngine<IListBoxItem, any>(LIST_BOX_EXTENSIONS())

	for (const build of Object.values(LIST_BOX_OWNER_EXTENSIONS)) engine.use(build(owner))

	return engine as TListBoxCollection
}
