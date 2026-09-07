import { TBaseOwnerItemExtension } from '../../../../../base/collection'
import type { IExtension } from '../../../../../base/collection'
import type { ICollapseItem } from '../../../item/types'
import { TCollapseContentItemExtension, type ICollapseContentItemExtension } from './item'
import type {
	ICollapseContentExtension,
	ICollapseContentExtensionOptions,
	TCollapseContentExtensionEvents,
} from './types'

/**
 * TCollapseContentExtension — расширение коллекции под панели Collapse.
 *
 * Раздаёт item-адаптер, который считает связку «заголовок ↔ панель». Владелец
 * не нужен: связка строится от элемента, а не от инстанса TCollapse.
 */
export class TCollapseContentExtension<TItem extends ICollapseItem = ICollapseItem>
	extends TBaseOwnerItemExtension<
		TItem,
		ICollapseContentItemExtension<TItem>,
		TCollapseContentExtensionEvents
	>
	implements IExtension<TItem>, ICollapseContentExtension<TItem>
{
	readonly name = 'content' as const

	constructor(options?: ICollapseContentExtensionOptions<TItem>) {
		super(TCollapseContentItemExtension as any, options)
	}
}
