import { TCollectionEngine } from '../../../base/collection'
import type {
	TListBaseCollectionExtensions,
	IListCollectionProps,
	IListCollectionItemProps,
	TListAdapters,
} from '../../list/collection/types'
import type { IListBoxItemExtension } from './extensions/list-box/item/types'
import { TListBoxExtension } from './extensions'
import type { IListBox } from '../types'
import type { IListBoxItem } from '../item/types'
import type { IListBoxItemProps } from '../item/types'

export type TListBoxCollectionExtensions = TListBaseCollectionExtensions<IListBoxItem> & {
	list: TListBoxExtension<IListBox, IListBoxItem>
}

export type TListBoxCollection = TCollectionEngine<IListBoxItem, TListBoxCollectionExtensions>

/**
 * Owner-level props коллекции ListBox.
 * Наследует List и добавляет engine-тип ListBox.
 */
export interface IListBoxCollectionProps<
	TItemProps = IListBoxItemProps,
	TItem = IListBoxItem,
> extends IListCollectionProps<TItemProps, TItem, TListBoxCollection> {}

/**
 * Item-level props элемента ListBox.
 * Наследует item-пропсы List.
 */
export interface IListBoxCollectionItemProps extends IListCollectionItemProps {}

/**
 * Item-адаптеры коллекции ListBox — те же, что у List, но `list` знает `view`.
 *
 * Раньше фасад элемента брал тип адаптеров от List и приводил всё к `any`.
 * Теперь типизировано всё, кроме одного релея `change:view`: набор событий
 * вшит в `IListItemExtension` и наследником не расширяется.
 */
export type TListBoxAdapters = TListAdapters<IListBoxItem> & {
	list: IListBoxItemExtension<IListBoxItem>
}
