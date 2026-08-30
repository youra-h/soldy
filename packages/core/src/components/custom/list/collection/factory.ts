import { TListCollection } from './types'
import { TListExtension } from './extensions/list.extension'
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
import TListItem from './../list-item/list-item.class'
import type { IListItem } from './../list-item/types'
import type { IList } from './../types'

export const ListFactory = (instance: IList): TListCollection =>
	new TCollection({
		extensions: {
			factory: new TFactoryExtension<IListItem>({ itemCtor: TListItem }),
			unique: new TUniqueExtension<IListItem>(),
			meta: new TMetaExtension<IListItem>(),
			order: new TOrderExtension<IListItem>(),
			plain: new TPlainExtension<IListItem>(),
			batch: new TBatchExtension<IListItem>(),
			selection: new TSelectionExtension<IListItem>(),
			list: new TListExtension({ owner: instance }),
		},
	})
