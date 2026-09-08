import { TSelectionCollectionFacade } from '../../../../base/collection'
import type {
	TCollectionEngine,
	TSelectionFacadeProps,
	IExtension,
	TBatchExtension,
	TSelectionExtension,
} from '../../../../base/collection'
import { ListFactory } from '../factory'
import type { TListCollectionExtensions, TListCollectionFacadeOptions } from '../types'
import type { IList } from '../../types'
import type { IListItem } from '../../item/types'

/**
 * Фасад коллекции list.
 *
 * Своего не добавляет ничего — состав и выбор целиком из базы. Существует
 * потому, что List это настоящий компонент со своим дескриптором, и потому,
 * что ListBox наследует его вместе с подменой фабрики движка.
 */
export class TListCollectionFacade<
	TItem extends IListItem = IListItem,
	TExtensions extends {
		batch: TBatchExtension<any>
		selection: TSelectionExtension<any>
	} & Record<string, IExtension<any>> = TListCollectionExtensions,
> extends TSelectionCollectionFacade<TItem, TExtensions> {
	constructor(
		props: TSelectionFacadeProps<TItem> = {},
		options: TListCollectionFacadeOptions<TItem, TExtensions> = {},
	) {
		const createEngine =
			options.factory ??
			(ListFactory as unknown as (
				owner: IList<any, any, any>,
			) => TCollectionEngine<TItem, TExtensions>)

		super({}, { engine: options.engine ?? createEngine(options.owner!) })

		this.applyProps(props)
	}
}
