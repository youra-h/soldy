import type {
	IBaseOwnerItemExtensionOptions,
	IExtension,
	IExtensionItems,
} from '../../../../../base/collection'
import type { TListEvents, TListIndicator } from '../../../../list'
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
	/** Текст выбранного — то, что показывает поле вместо `placeholder`. */
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

/**
 * События расширения `select` — сторона отметки, доезжающая до item-адаптеров.
 *
 * Карта была `Record<string, never>` — «событий нет». Но у неё индексная
 * сигнатура, поэтому проверка читала её как «любое имя», и `change:indicator`,
 * который расширение релеит с владельца, проезжал мимо. Имя объявлено, тип
 * взят у источника — разойтись не даст.
 */
export type TSelectExtensionEvents = Pick<TListEvents, 'change:indicator'>
