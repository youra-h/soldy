import type {
	IBaseOwnerItemExtensionOptions,
	IExtension,
	IExtensionItems,
} from '../../../../../base/collection'
import type { TListIndicator } from '../../../../list'
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
	readonly text: string
	/** Где стоит отметка выбранной опции — свойство поля, не опции. */
	readonly indicator: TListIndicator
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
	/** change:text — сменился текст выбранного */
	'change:text': (value: string) => void
}
