import type { TCollectionFacadeProps } from '../../../base/collection'
import { TListCollectionFacade } from '../../list/collection/facade'
import type { TListCollectionFacadeOptions } from '../../list/collection/types'
import { ListBoxFactory } from './factory'
import type { TListBoxCollection, TListBoxCollectionExtensions } from './types'
import type { IListBox } from '../types'
import type { IListBoxItem } from '../list-box-item/types'

/**
 * Фасад коллекции listBox.
 *
 * Наследует TListCollectionFacade (items, trackBy, mode, selected) и добавляет view.
 */
export class TListBoxCollectionFacade extends TListCollectionFacade<
	IListBoxItem,
	TListBoxCollectionExtensions
> {
	constructor(
		props: TCollectionFacadeProps<IListBoxItem> = {},
		options: TListCollectionFacadeOptions<IListBoxItem, TListBoxCollectionExtensions> = {},
	) {
		super(props, {
			...options,
			factory: (owner) => ListBoxFactory(owner as IListBox) as unknown as TListBoxCollection,
		})
	}

	get view(): IListBox['view'] {
		return this.extensions.listBox.view
	}
}
