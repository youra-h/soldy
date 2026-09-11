import type { ITags } from '../../../types'
import type { TTagsView } from '../../../types'
import type {
	IBaseOwnerItemExtensionOptions,
	IExtension,
	IExtensionItems,
} from '../../../../../base/collection'
import type { TTagsExtension } from './tags.extension'
import type { ITagsItemExtension } from './item'
import type { ITagsItem } from '../../../item/types'

/**
 * Контракт расширения тегов.
 * Используется как тип `TParent` в `TTagsItemExtension` для доступа к `_parent`.
 */
export interface ITagsExtension<TItem extends ITagsItem = ITagsItem>
	extends IExtension<TItem>, IExtensionItems<TItem, ITagsItemExtension<TItem>> {
	/** Глобальный closable с инстанса TTags. */
	readonly closable: boolean

	/** Внешний вид тегов — со набора целиком, как `view` у `TListBoxExtension`. */
	readonly view: TTagsView

	/** Закрыть тег (удалить элемент из коллекции). */
	closeTag(item: TItem): boolean
}

/**
 * Опции конструктора TTagsExtension.
 */
export interface ITagsExtensionOptions<
	TOwner extends ITags = ITags,
	TItem extends ITagsItem = ITagsItem,
> extends IBaseOwnerItemExtensionOptions<TItem, ITagsItemExtension<TItem>> {
	/** Ссылка на инстанс компонента TTags. */
	owner: TOwner
}

/** События расширения TTagsExtension. */
export type TTagsExtensionEvents = {
	'item:close': (item: ITagsItem) => void
	'change:closable': (value: boolean) => void
	/** change:view */
	'change:view': (value: TTagsView) => void
}

export type TTagsExtensions<TItem extends ITagsItem> = {
	tags: TTagsExtension<any, TItem>
	[key: string]: IExtension<TItem>
}
