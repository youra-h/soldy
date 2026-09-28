import { TSelectionCollectionFacade } from '../../../../base/collection'
import type { TCollectionFacadeOptions, TSelectionFacadeProps } from '../../../../base/collection'
import { LIST_BOX_EXTENSIONS } from '../factory'
import { createEngineListBox } from '../create'
import { completeEngine } from '../../../../base/collection/create/internal'
import type { TListBoxCollectionExtensions, TListBoxCollectionFacadeEngine } from '../types'
import type { IListBoxItem } from '../../item/types'
import type { IListBox } from '../../types'
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
		options: TCollectionFacadeOptions<TListBoxCollectionFacadeEngine, IListBox>,
	) {
		// Движок пришёл снаружи — дособрать до компонента; нет — собрать свой.
		// Здесь, а не в теле: базы трогают расширения в своих конструкторах
		super(
			{},
			{
				engine: options.engine
					? completeEngine(options.engine, LIST_BOX_EXTENSIONS(), options.owner)
					: createEngineListBox({ owner: options.owner }),
			},
		)

		this.applyProps(props)
	}

	get view(): TListBoxView | undefined {
		return this.extensions.list.view
	}
}
