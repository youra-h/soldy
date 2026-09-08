import type { TSelectionFacadeProps } from '../../../../base/collection'
import type { TListBoxView } from '../../types'
import { TListCollectionFacade } from '../../../list/collection/facade'
import type { TListCollectionFacadeOptions } from '../../../list/collection/types'
import { ListBoxFactory } from '../factory'
import type { TListBoxCollection, TListBoxCollectionExtensions } from '../types'
import type { IListBox } from '../../types'
import type { IListBoxItem } from '../../item/types'

/**
 * Фасад коллекции listBox.
 *
 * Наследует `TListCollectionFacade`, а не базу напрямую: List — настоящий
 * компонент, и ListBox действительно есть List. Своё — только `view` и
 * подмена фабрики движка.
 */
export class TListBoxCollectionFacade extends TListCollectionFacade<
	IListBoxItem,
	TListBoxCollectionExtensions
> {
	constructor(
		props: TSelectionFacadeProps<IListBoxItem> = {},
		options: TListCollectionFacadeOptions<IListBoxItem, TListBoxCollectionExtensions> = {},
	) {
		super(props, {
			...options,
			factory: (owner) => ListBoxFactory(owner as IListBox) as unknown as TListBoxCollection,
		})
	}

	get view(): TListBoxView {
		return this.extensions.list.view
	}
}
