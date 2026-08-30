import type { IListBox, TListBoxView } from '../../types'
import type {
	IBaseOwnerItemExtensionOptions,
	IExtension,
	IExtensionItems,
} from '../../../../base/collection'
import type { TListBoxExtension } from './list-box.extension'
import type { IListBoxItemExtension } from './item'
import type { IListBoxItem } from '../../list-box-item/types'

/**
 * Контракт расширения listBox.
 * Используется как тип TParent в TListBoxItemExtension для типизированного доступа к _parent.
 */
export interface IListBoxExtension<TItem extends IListBoxItem = IListBoxItem>
	extends IExtension<TItem>, IExtensionItems<TItem, IListBoxItemExtension<TItem>> {
	/** Глобальный wordWrap с инстанса TListBox (наследуется от TList). */
	readonly wordWrap: boolean
	/** Внешний вид с инстанса TListBox. */
	readonly view: TListBoxView
}

/**
 * Опции конструктора TListBoxExtension.
 * Расширяет IBaseOwnerItemExtensionOptions ссылкой на инстанс TListBox.
 */
export interface IListBoxExtensionOptions<
	TOwner extends IListBox = IListBox,
	TItem extends IListBoxItem = IListBoxItem,
> extends IBaseOwnerItemExtensionOptions<TItem, IListBoxItemExtension<TItem>> {
	/** Ссылка на инстанс компонента TListBox. */
	owner: TOwner
}

/**
 * События расширения TListBoxExtension.
 */
export type TListBoxExtensionEvents = {
	'change:wordWrap': (value: boolean) => void
	'change:view': (value: TListBoxView) => void
}

export type TListBoxExtensions<TItem extends IListBoxItem> = {
	listBox: TListBoxExtension<any, TItem>
	[key: string]: IExtension<TItem>
}
