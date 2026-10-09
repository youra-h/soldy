import { TSelectionCollectionFacade } from '../../../../base/collection'
import type {
	TCollectionEngine,
	TCollectionFacadeOptions,
	TDrawnEntry,
	TSelectionFacadeProps,
} from '../../../../base/collection'
import { listBoxExtensions } from '../factory'
import { completeEngine } from '../../../../base/collection/create/internal'
import type {
	TListBoxCollectionExtensions,
	TListBoxCollectionFacadeEngine,
	TListBoxCollectionFacadeEvents,
} from '../types'
import type { IListBoxItem } from '../../item/types'
import type { IListBox } from '../../types'
import type { TListBoxView } from '../../types'

/**
 * Фасад коллекции списка.
 *
 * Состав и выбор приходят из базы; своё — `view` и что список рисует
 * (`drawn`, расширение `draw`): без окна все показанные элементы, в окне —
 * видимые и распорки на месте пропущенных. Окно ставит обёртка `Virtual`
 * вокруг списка. Раньше между фасадом и базой стоял `TListCollectionFacade`,
 * не добавлявший ничего: он существовал ради компонента `TList`, которого
 * больше нет.
 */
export class TListBoxCollectionFacade extends TSelectionCollectionFacade<
	IListBoxItem,
	TListBoxCollectionExtensions,
	TListBoxCollectionFacadeEvents
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
				engine: completeEngine(options.engine, listBoxExtensions()) as TCollectionEngine<
					IListBoxItem,
					TListBoxCollectionExtensions
				>,
				owner: options.owner,
			},
		)

		if (!options.engine) this.bindOwner()

		this.events.relayAll(this.extensions.draw.events)

		this.applyProps(props)
	}

	get view(): TListBoxView | undefined {
		return this.extensions.list.view
	}

	/**
	 * Что рисует список по порядку: элементы на своих местах и, в окне,
	 * распорки на месте пропущенных. Без окна — все показанные элементы
	 */
	get drawn(): ReadonlyArray<TDrawnEntry<IListBoxItem>> {
		return this.extensions.draw.drawn
	}
}
