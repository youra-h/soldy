import {
	TCollectionEngine,
	TFactoryExtension,
	TOrderExtension,
	TPlainExtension,
	TUniqueExtension,
	TMetaExtension,
	TBatchExtension,
	TSelectionExtension,
} from '../../../base/collection'
import TSelectItem from '../item/item.class'
import type { ISelectItem } from '../item/types'
import type { ISelect } from '../types'
import { TSelectExtension } from './extensions'
import type { TSelectCollection } from './types'

/**
 * Движок коллекции Select.
 *
 * Порядок объявления важен: `meta` идёт до `selection`, иначе `selected`,
 * заданный пропом опции, не успеет примениться.
 *
 * `activation` нет: у списка выбора нет «активного» элемента отдельно от
 * выбранного. Подсветку при навигации с клавиатуры ведёт `TListItemPlugin`,
 * а не коллекция — она визуальна и живёт только пока панель открыта.
 */
export const SelectFactory = (instance: ISelect): TSelectCollection =>
	new TCollectionEngine({
		extensions: {
			factory: new TFactoryExtension<ISelectItem>({ itemCtor: TSelectItem }),
			unique: new TUniqueExtension<ISelectItem>(),
			meta: new TMetaExtension<ISelectItem>(),
			order: new TOrderExtension<ISelectItem>(),
			plain: new TPlainExtension<ISelectItem>(),
			batch: new TBatchExtension<ISelectItem>(),
			selection: new TSelectionExtension<ISelectItem>(),
			select: new TSelectExtension({ owner: instance }),
		},
	})
