import { TSelectionCollectionFacade } from '../../../../base/collection'
import type {
	TCollectionEngine,
	TCollectionFacadeOptions,
	TSelectionFacadeProps,
} from '../../../../base/collection'
import { ListBoxFactory, LIST_BOX_EXTENSIONS, LIST_BOX_OWNER_EXTENSIONS } from '../factory'
import { resolveEngine } from '../../../../base/collection/create/internal'
import type {
	TListBoxCollection,
	TListBoxCollectionExtensions,
	TListBoxCollectionFacadeEngine,
} from '../types'
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
		options: TCollectionFacadeOptions<TListBoxCollectionFacadeEngine, IListBox> & {
			/** Фабрика движка коллекции — переопределяется наследником. */
			factory?: (owner: IListBox) => TListBoxCollection
		} = {},
	) {
		const createEngine = options.factory ?? ListBoxFactory

		// Движок мог прийти снаружи собранным на любом уровне — `resolveEngine`
		// дополнит его до того, что нужно ListBox. Именно здесь, а не в теле:
		// базы трогают расширения в своих конструкторах
		super(
			{},
			{
				engine: resolveEngine(
					options,
					LIST_BOX_EXTENSIONS(),
					LIST_BOX_OWNER_EXTENSIONS,
					'ListBox',
					createEngine,
				) as TCollectionEngine<IListBoxItem, TListBoxCollectionExtensions>,
			},
		)

		this.applyProps(props)
	}

	get view(): TListBoxView | undefined {
		return this.extensions.list.view
	}
}
