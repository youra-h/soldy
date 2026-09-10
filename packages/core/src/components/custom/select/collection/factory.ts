import { TValueSelectionExtension } from '../../../base/collection'
import { selectionExtensions, assembleEngine } from '../../../base/collection/create/internal'
import type { TExtensionSet, TOwnerExtensionSet } from '../../../base/collection/create/internal'
import TSelectItem from '../item/item.class'
import type { ISelectItem } from '../item/types'
import type { ISelect } from '../types'
import { TSelectExtension } from './extensions'
import type { TSelectCollection } from './types'

/**
 * Состав коллекции Select — объявлением, а не функцией сборки.
 *
 * Разделён надвое, потому что владелец есть не всегда: коллекцию можно собрать
 * снаружи (`createEngine`) и передать компоненту, а инстанс `TSelect` появится
 * только там.
 *
 * `activation` нет: у списка выбора нет «активного» элемента отдельно от
 * выбранного. Подсветку при навигации с клавиатуры ведёт `TListItemPlugin`,
 * а не коллекция — она визуальна и живёт только пока панель открыта.
 */
export const SELECT_EXTENSIONS = (): TExtensionSet<ISelectItem> => ({
	...selectionExtensions<ISelectItem>(TSelectItem as unknown as new (source: any) => ISelectItem),
})

/** То, чему нужен инстанс компонента. */
export const SELECT_OWNER_EXTENSIONS: TOwnerExtensionSet<ISelectItem, ISelect> = {
	// Связь `value` ↔ выбор — то же расширение, что у ListBox. Раньше это было
	// написано внутри `TSelectExtension`, пока Select оставался единственным
	// списком со значением
	value: (owner) => new TValueSelectionExtension({ owner }) as never,
	select: (owner) => new TSelectExtension({ owner }) as never,
}

/**
 * Полная коллекция Select. Внутренняя: наружу ведёт `createEngineSelect`,
 * который требует владельца явно.
 */
export const SelectFactory = (owner: ISelect): TSelectCollection => {
	const engine = assembleEngine<ISelectItem, any>(SELECT_EXTENSIONS())

	for (const build of Object.values(SELECT_OWNER_EXTENSIONS)) engine.use(build(owner))

	return engine as TSelectCollection
}
