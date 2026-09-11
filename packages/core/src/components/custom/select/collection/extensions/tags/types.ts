import type { IExtension } from '../../../../../base/collection'
import type { ITags, TTagsCollection } from '../../../../tags'
import type { ISelect } from '../../../types'
import type { ISelectItem } from '../../../item/types'

/**
 * Контракт расширения тегов Select.
 *
 * Живёт только в `multiple`: в `single` инстанса нет вовсе — теги рисуют
 * выбор набора, а не одной опции.
 */
export interface ISelectTagsExtension<TItem extends ISelectItem = ISelectItem>
	extends IExtension<TItem, TSelectTagsExtensionEvents> {
	/** Инстанс `TTags`, пока режим `multiple`; иначе `null`. */
	readonly tags: ITags | null
	/** Коллекция тегов — та, что рисует `tags` своими элементами. */
	readonly engine: TTagsCollection | null
}

export interface ISelectTagsExtensionOptions<TOwner extends ISelect = ISelect> {
	owner: TOwner
}

export type TSelectTagsExtensionEvents = {
	/** change:tags — сменился инстанс тегов (появился/пропал при смене режима) */
	'change:tags': (value: ITags | null) => void
}
