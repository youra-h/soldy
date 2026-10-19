import type { IExtension } from '../../../../../base/collection'
import type { ITags, TTagsCollection, TTagsOverflow } from '../../../../tags'
import type { ISelectItem } from '../../../item/types'

/**
 * Контракт расширения тегов Select.
 *
 * Живёт только в `multiple`: в `single` инстанса нет вовсе — теги рисуют
 * выбор набора, а не одной опции.
 */
export interface ISelectTagsExtension<TItem extends ISelectItem = ISelectItem> extends IExtension<
	TItem,
	TSelectTagsExtensionEvents
> {
	/** Инстанс `TTags`, пока режим `multiple`; иначе `null`. */
	readonly tags: ITags | null
	/** Коллекция тегов — та, что рисует `tags` своими элементами. */
	readonly engine: TTagsCollection | null
	/** Что делать с тегами, которым не хватило строки поля. */
	overflow: TTagsOverflow
	/**
	 * Есть ли в поле хоть один тег. Не то же, что наличие `tags`: инстанс
	 * живёт всё время, пока режим `multiple`, даже когда не выбрано ничего.
	 */
	readonly hasTags: boolean
	/**
	 * Пересобрать теги по выбору Select. Зовёт расширение `select` на
	 * переименование выбранной опции: `change:selection` на него не приходит.
	 * Вне `multiple` тегов нет, и вызов ничего не делает.
	 */
	syncTags(): void
}

export type TSelectTagsExtensionEvents = {
	/** change:tags — сменился инстанс тегов (появился/пропал при смене режима) */
	'change:tags': (value: ITags | null) => void
	/** change:overflow — сменился режим переполнения ряда тегов */
	'change:overflow': (value: TTagsOverflow) => void
}
