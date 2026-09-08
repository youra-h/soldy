import { TListBoxCollection } from './types'
import { TListBoxExtension } from './extensions'
import {
	TCollectionEngine,
	TPlainExtension,
	TBatchExtension,
	TFactoryExtension,
	TSelectionExtension,
	TOrderExtension,
	TUniqueExtension,
	TMetaExtension,
	TValueSelectionExtension,
} from './../../../base'
import TListBoxItem from './../item/item.class'
import type { IListBoxItem } from './../item/types'
import type { IListBox } from './../types'

export const ListBoxFactory = (instance: IListBox): TListBoxCollection =>
	new TCollectionEngine({
		extensions: {
			factory: new TFactoryExtension<IListBoxItem>({ itemCtor: TListBoxItem }),
			unique: new TUniqueExtension<IListBoxItem>(),
			meta: new TMetaExtension<IListBoxItem>(),
			order: new TOrderExtension<IListBoxItem>(),
			plain: new TPlainExtension<IListBoxItem>(),
			batch: new TBatchExtension<IListBoxItem>(),
			selection: new TSelectionExtension<IListBoxItem>(),
			// Связь `value` ↔ выбор. Без неё проп `value` у ListBox был бы
			// объявлен, но мёртв
			value: new TValueSelectionExtension({ owner: instance }),
			list: new TListBoxExtension({ owner: instance }),
		},
	})
