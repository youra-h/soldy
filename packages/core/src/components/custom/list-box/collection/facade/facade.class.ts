import { TSelectionCollectionFacade } from '../../../../base/collection'
import type { TCollectionEngine, TSelectionFacadeProps } from '../../../../base/collection'
import { ListBoxFactory } from '../factory'
import type {
	TListBoxCollectionExtensions,
	TListBoxCollectionFacadeOptions,
} from '../types'
import type { IListBox } from '../../types'
import type { IListBoxItem } from '../../item/types'
import type { TListBoxView } from '../../types'

/**
 * Фасад коллекции списка.
 *
 * Состав и выбор приходят из базы; своё — только `view`. Раньше между ним и
 * базой стоял `TListCollectionFacade`, не добавлявший ничего: он существовал
 * ради компонента `TList`, которого больше нет.
 */
export class TListBoxCollectionFacade extends TSelectionCollectionFacade<
	IListBoxItem,
	TListBoxCollectionExtensions
> {
	constructor(
		props: TSelectionFacadeProps<IListBoxItem> = {},
		options: TListBoxCollectionFacadeOptions = {},
	) {
		const createEngine =
			options.factory ??
			(ListBoxFactory as unknown as (
				owner: IListBox,
			) => TCollectionEngine<IListBoxItem, TListBoxCollectionExtensions>)

		super({}, { engine: options.engine ?? createEngine(options.owner!) })

		this.applyProps(props)
	}

	get view(): TListBoxView {
		return this.extensions.list.view
	}
}
