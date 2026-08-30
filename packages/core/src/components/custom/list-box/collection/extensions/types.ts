import type { IListBox, TListBoxView } from '../../types'
import type { IExtension } from '../../../../base/collection'
import type { IListExtension, IListExtensionOptions, TListExtensionEvents } from '../../../list'
import type { TListBoxExtension } from './list-box.extension'
import type { IListBoxItemExtension } from './item'
import type { IListBoxItem } from '../../list-box-item/types'

/**
 * Контракт расширения listBox.
 * Наследует IListExtension (wordWrap) и добавляет view.
 */
export interface IListBoxExtension<
	TItem extends IListBoxItem = IListBoxItem,
> extends IListExtension<TItem, IListBoxItemExtension<TItem>> {
	/** Внешний вид с инстанса TListBox. */
	readonly view: TListBoxView
}

/**
 * Опции конструктора TListBoxExtension.
 * Наследует IListExtensionOptions (owner) с типизацией IListBoxItemExtension.
 */
export interface IListBoxExtensionOptions<
	TOwner extends IListBox = IListBox,
	TItem extends IListBoxItem = IListBoxItem,
> extends IListExtensionOptions<TOwner, TItem, IListBoxItemExtension<TItem>> {}

/**
 * События расширения TListBoxExtension.
 * Наследует TListExtensionEvents (change:wordWrap) и добавляет change:view.
 */
export type TListBoxExtensionEvents = TListExtensionEvents & {
	'change:view': (value: TListBoxView) => void
}

export type TListBoxExtensions<TItem extends IListBoxItem> = {
	listBox: TListBoxExtension<any, TItem>
	[key: string]: IExtension<TItem>
}
