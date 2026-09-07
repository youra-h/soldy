import { TCollapseCollection } from './types'
import { TCollapseExtension, TCollapseContentExtension } from './extensions'
import {
	TCollectionEngine,
	TPlainExtension,
	TBatchExtension,
	TFactoryExtension,
	TSelectionExtension,
	TOrderExtension,
	TUniqueExtension,
	TMetaExtension,
} from './../../../base'
import TCollapseItem from './../item/item.class'
import type { ICollapseItem } from './../item/types'
import type { ICollapse } from './../types'

export const CollapseFactory = (instance: ICollapse): TCollapseCollection =>
	new TCollectionEngine({
		extensions: {
			factory: new TFactoryExtension<ICollapseItem>({ itemCtor: TCollapseItem }),
			unique: new TUniqueExtension<ICollapseItem>(),
			meta: new TMetaExtension<ICollapseItem>(),
			order: new TOrderExtension<ICollapseItem>(),
			plain: new TPlainExtension<ICollapseItem>(),
			batch: new TBatchExtension<ICollapseItem>(),
			selection: new TSelectionExtension<ICollapseItem>(),
			collapse: new TCollapseExtension({ owner: instance }),
			content: new TCollapseContentExtension<ICollapseItem>(),
		},
	})
