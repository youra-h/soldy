import { TGroupCollectionFacade } from '../../../../base/collection'
import type {
	TCollectionEngine,
	TCollectionFacadeOptions,
	TDrawnEntry,
	TDrawnSection,
	TGroupFacadeProps,
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
 * Состав, выбор и группировка приходят из базы (`TGroupCollectionFacade`);
 * своё — `view` и что список рисует (расширение `draw`): без окна все
 * показанные элементы, в окне — видимые и распорки на месте пропущенных, а по
 * секциям группировки — `drawnSections`, отсюда рисует разметка. Окно ставит
 * обёртка `Virtual` вокруг списка; список с группами она не рисует. Раньше
 * между фасадом и базой стоял `TListCollectionFacade`, не добавлявший ничего:
 * он существовал ради компонента `TList`, которого больше нет.
 */
export class TListBoxCollectionFacade extends TGroupCollectionFacade<
	IListBoxItem,
	TListBoxCollectionExtensions,
	TListBoxCollectionFacadeEvents
> {
	constructor(
		props: TGroupFacadeProps<IListBoxItem> = {},
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

	/**
	 * Что рисует список, по секциям группировки: группа с подписью или
	 * элементы без группы, между соседними секциями — разделитель. Без групп
	 * секция одна — все записи `drawn`
	 */
	get drawnSections(): ReadonlyArray<TDrawnSection<IListBoxItem>> {
		return this.extensions.draw.drawnSections
	}
}
