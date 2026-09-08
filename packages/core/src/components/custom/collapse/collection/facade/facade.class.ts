import { TSelectionCollectionFacade } from '../../../../base/collection'
import type { TCollectionFacadeOptions, TSelectionFacadeProps } from '../../../../base/collection'
import type { TCollapseView } from '../../types'
import { CollapseFactory } from '../factory'
import type { TCollapseCollection, TCollapseCollectionExtensions } from '../types'
import type { ICollapseItem } from '../../item/types'
import type { ICollapse } from '../../types'

/**
 * Фасад коллекции collapse.
 *
 * Состав и выбор приходят из базы; своё — только `view`. Используется как
 * `ctor` в `CollapseCollectionDescriptor`.
 */
export class TCollapseCollectionFacade extends TSelectionCollectionFacade<
	ICollapseItem,
	TCollapseCollectionExtensions
> {
	constructor(
		props: TSelectionFacadeProps<ICollapseItem> = {},
		options: TCollectionFacadeOptions<TCollapseCollection, ICollapse> = {},
	) {
		super({}, { engine: options.engine ?? CollapseFactory(options.owner!) })

		this.events.relay(this.extensions.collapse.events, ['change:view'])

		this.applyProps(props)
	}

	get view(): TCollapseView {
		return this.extensions.collapse.view
	}
}
