import { TTagsCollection } from './types'
import { TTagsExtension } from './extensions'
import { TValueSelectionExtension } from './../../../base'
import { TSelectionExtension } from './../../../base/collection'
import { selectionExtensions, assembleEngine } from './../../../base/collection/create/internal'
import type { TExtensionSet, TOwnerExtensionSet } from './../../../base/collection/create/internal'
import TTagsItem from './../item/item.class'
import type { ITagsItem } from './../item/types'
import type { ITags } from './../types'

/**
 * Состав коллекции Tags — объявлением, а не функцией сборки.
 *
 * `selection.mode` по умолчанию `'none'`, а не `'single'` из
 * `TSelectionExtension`: набору тегов выделение не требуется, оно включается
 * явным `mode`, когда нужно (например, множественный выбор Select,
 * отображённый тегами). Дефолт самого `TSelectionExtension` не трогаем —
 * переопределение только здесь, в фабрике конкретной коллекции.
 */
export const TAGS_EXTENSIONS = (): TExtensionSet<ITagsItem> => ({
	...selectionExtensions<ITagsItem>(TTagsItem as unknown as new (source: any) => ITagsItem),
	selection: () => {
		const selection = new TSelectionExtension<ITagsItem>()

		selection.mode = 'none'

		return selection
	},
})

/** То, чему нужен инстанс компонента. */
export const TAGS_OWNER_EXTENSIONS: TOwnerExtensionSet<ITagsItem, ITags> = {
	// Связь `value` ↔ выбор. Без неё проп `value` у Tags был бы объявлен, но мёртв
	value: (owner) => new TValueSelectionExtension({ owner }) as never,
	tags: (owner) => new TTagsExtension({ owner }) as never,
}

/**
 * Полная коллекция Tags. Внутренняя: наружу ведёт `createEngineTags`, который
 * требует владельца явно.
 */
export const TagsFactory = (owner: ITags): TTagsCollection => {
	const engine = assembleEngine<ITagsItem, any>(TAGS_EXTENSIONS())

	for (const build of Object.values(TAGS_OWNER_EXTENSIONS)) engine.use(build(owner))

	return engine as TTagsCollection
}
