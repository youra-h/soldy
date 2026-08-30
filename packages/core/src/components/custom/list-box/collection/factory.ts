import { TListBoxCollection } from './types'
import { TListBoxExtension } from './extensions/list-box.extension'
import {
	TCollection,
	TPlainExtension,
	TBatchExtension,
	TFactoryExtension,
	TSelectionExtension,
	TOrderExtension,
	TUniqueExtension,
	TMetaExtension,
} from './../../../base'
import TListBoxItem from './../list-box-item/list-box-item.class'
import type { IListBoxItem } from './../list-box-item/types'
import type { IListBox } from './../types'

export const ListBoxFactory = (instance: IListBox): TListBoxCollection =>
	new TCollection({
		extensions: {
			factory: new TFactoryExtension<IListBoxItem>({ itemCtor: TListBoxItem }),
			unique: new TUniqueExtension<IListBoxItem>(),
			meta: new TMetaExtension<IListBoxItem>(),
			order: new TOrderExtension<IListBoxItem>(),
			plain: new TPlainExtension<IListBoxItem>(),
			batch: new TBatchExtension<IListBoxItem>(),
			selection: new TSelectionExtension<IListBoxItem>(),
			listBox: new TListBoxExtension({ owner: instance }),
		},
	})
