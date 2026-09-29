import { TSelectionCollectionFacade } from '../../../../base/collection'
import type {
	TCollectionEngine,
	TCollectionFacadeOptions,
	TSelectionFacadeProps,
} from '../../../../base/collection'
import { listBoxExtensions } from '../factory'
import { withOwnerIds, completeEngine } from '../../../../base/collection/create/internal'
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
		options: TCollectionFacadeOptions<TListBoxCollectionFacadeEngine, IListBox> = {},
	) {
		// Движок мог прийти снаружи собранным на любом уровне — `completeEngine`
		// доставит в него то, чего не хватает ListBox. Именно здесь, а не в теле:
		// базы трогают расширения в своих конструкторах
		super(
			{},
			{
				engine: withOwnerIds(
					completeEngine(options.engine, listBoxExtensions(options.owner)),
					options.owner,
				) as TCollectionEngine<IListBoxItem, TListBoxCollectionExtensions>,
			},
		)

		this.applyProps(props)
	}

	get view(): TListBoxView | undefined {
		return this.extensions.list.view
	}
}
