import type { IListBox, TListBoxView } from '../../../types'
import type { TListIndicator } from '../../../../list'
import type {
	IBaseOwnerItemExtensionOptions,
	IExtension,
	IExtensionItems,
} from '../../../../../base/collection'
import type { TListBoxExtension } from './list-box.extension'
import type { IListBoxItemExtension } from './item'
import type { IListBoxItem } from '../../../item/types'

/**
 * Контракт расширения списка.
 *
 * Используется как тип `TParent` в `TListBoxItemExtension` — через него
 * item-адаптер типизированно достаёт `view` владельца.
 */
export interface IListBoxExtension<
	TItem extends IListBoxItem = IListBoxItem,
	// `any` в констрейнте намеренно: карта событий инвариантна, и требовать
	// здесь точный набор значило бы запретить наследнику её расширить
	TItemExt extends IListBoxItemExtension<TItem, any> = IListBoxItemExtension<TItem>,
>
	extends IExtension<TItem>, IExtensionItems<TItem, TItemExt> {
	/** Внешний вид со списка. */
	readonly view: TListBoxView
	/** Где стоит отметка выбранного — свойство списка, не элемента. */
	readonly indicator: TListIndicator
}

/** Опции конструктора: ссылка на инстанс списка. */
export interface IListBoxExtensionOptions<
	TOwner extends IListBox = IListBox,
	TItem extends IListBoxItem = IListBoxItem,
	TItemExt extends IListBoxItemExtension<TItem, any> = IListBoxItemExtension<TItem>,
> extends IBaseOwnerItemExtensionOptions<TItem, TItemExt> {
	/** Ссылка на инстанс компонента списка. */
	owner: TOwner
}

export type TListBoxExtensionEvents = {
	'change:view': (value: TListBoxView) => void
	'change:indicator': (value: TListIndicator) => void
}

export type TListBoxExtensions<TItem extends IListBoxItem> = {
	list: TListBoxExtension<any, TItem>
	[key: string]: IExtension<TItem>
}
