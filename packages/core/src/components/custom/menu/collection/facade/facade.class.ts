import { TGroupCollectionFacade } from '../../../../base/collection'
import type { TCollectionEngine, TCollectionFacadeOptions } from '../../../../base/collection'
import { menuExtensions } from '../factory'
import { completeEngine } from '../../../../base/collection/create/internal'
import type {
	TMenuCollectionExtensions,
	TMenuCollectionFacadeEngine,
	TMenuCollectionFacadeEvents,
	TMenuCollectionFacadeProps,
} from '../types'
import type { IMenuItem } from '../../item/types'
import type { IMenuOwner } from '../../types'

/**
 * Фасад коллекции меню.
 *
 * Состав, выбор и группировка приходят из базы (`TGroupCollectionFacade`):
 * группы пунктов и секции показанного, по которым меню рисует пункты с
 * подписями групп и — пока их просит меню (`groupSeparators`) —
 * разделителями. Своё — проброс расширения `menu`: событие `choose`, нажатие
 * пункта-действия.
 *
 * Выбор у меню — отметки флажков, и режим у него всегда `multiple`: флажки
 * отмечаются независимо. Свой движок получает режим от `menuExtensions`, а
 * пришедший снаружи со своим выбором (`createEngineSelection`, у которого
 * `single`) фасад переводит в него сам — иначе второй флажок снимал бы
 * отметку с первого.
 */
export class TMenuCollectionFacade extends TGroupCollectionFacade<
	IMenuItem,
	TMenuCollectionExtensions,
	TMenuCollectionFacadeEvents
> {
	constructor(
		props: TMenuCollectionFacadeProps = {},
		options: TCollectionFacadeOptions<TMenuCollectionFacadeEngine, IMenuOwner<any>> = {},
	) {
		// Движок мог прийти снаружи собранным на любом уровне — `completeEngine`
		// доставит в него то, чего не хватает меню. Именно здесь, а не в теле:
		// базы трогают расширения в своих конструкторах
		super(
			{},
			{
				engine: completeEngine(options.engine, menuExtensions()) as TCollectionEngine<
					IMenuItem,
					TMenuCollectionExtensions
				>,
				owner: options.owner,
			},
		)

		if (!options.engine) this.bindOwner()

		this.extensions.selection.mode = 'multiple'

		this.events.relayAll(this.extensions.menu.events)

		this.applyProps(props)
	}
}
