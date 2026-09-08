import type {
	IBaseOwnerItemExtensionOptions,
	IExtension,
	IExtensionItems,
} from '../../../../../base/collection'
import type { ISelect } from '../../../types'
import type { ISelectItem } from '../../../item/types'
import type { ISelectItemExtension } from './item'

/**
 * Контракт расширения Select.
 *
 * Держит формулу идентификаторов связки «поле ↔ список ↔ опция» и
 * синхронизирует `value` владельца с выбором в коллекции.
 */
export interface ISelectExtension<TItem extends ISelectItem = ISelectItem>
	extends IExtension<TItem>, IExtensionItems<TItem, ISelectItemExtension<TItem>> {
	/** `id` элемента с `role="listbox"`. */
	readonly listId: string
	/** `id` элемента с `role="option"`. */
	optionId(item: TItem): string
	/** Текст выбранного — то, что показывает поле. */
	readonly valueText: string
	/**
	 * Выбрать опцию с учётом режима и `closeOnSelect` владельца.
	 * Возвращает `false`, если опция недоступна.
	 */
	chooseItem(item: TItem): boolean
	/** Снять выбор целиком. */
	clear(): void
}

export interface ISelectExtensionOptions<
	TOwner extends ISelect = ISelect,
	TItem extends ISelectItem = ISelectItem,
> extends IBaseOwnerItemExtensionOptions<TItem, ISelectItemExtension<TItem>> {
	owner: TOwner
}

export type TSelectExtensionEvents = {
	/** change:valueText — сменился текст выбранного */
	'change:valueText': (value: string) => void
}
