import { TCollapseCollection } from './types'
import { TCollapseExtension } from './extensions/collapse.extension'
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
import TCollapseItem from './../collapse-item/collapse-item.class'
import type { ICollapseItem } from './../collapse-item/types'
import type { ICollapse } from './../types'

export const CollapseFactory = (instance: ICollapse): TCollapseCollection =>
	new TCollection({
		extensions: {
			factory: new TFactoryExtension<ICollapseItem>({ itemCtor: TCollapseItem }),
			unique: new TUniqueExtension<ICollapseItem>(),
			meta: new TMetaExtension<ICollapseItem>(),
			order: new TOrderExtension<ICollapseItem>(),
			plain: new TPlainExtension<ICollapseItem>(),
			batch: new TBatchExtension<ICollapseItem>(),
			selection: new TSelectionExtension<ICollapseItem>(),
			collapse: new TCollapseExtension({ owner: instance }),
		},
	})
