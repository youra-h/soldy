import { TSelectionCollectionFacade } from '../../../../base/collection'
import type {
	TCollectionEngine,
	TCollectionFacadeOptions,
	TCollectionFacadeProps,
} from '../../../../base/collection'
import { menuExtensions } from '../factory'
import { completeEngine } from '../../../../base/collection/create/internal'
import type {
	TMenuCollectionExtensions,
	TMenuCollectionFacadeEngine,
	TMenuCollectionFacadeEvents,
} from '../types'
import type { IMenuItem } from '../../item/types'
import type { IMenu } from '../../types'

/**
 * Фасад коллекции меню.
 *
 * Состав и выбор приходят из базы (`TSelectionCollectionFacade`), своё —
 * проброс расширения `menu`: событие `choose`, нажатие пункта-действия.
 *
 * Выбор у меню — отметки флажков, и режим у него всегда `multiple`: флажки
 * отмечаются независимо. Свой движок получает режим от `menuExtensions`, а
 * пришедший снаружи со своим выбором (`createEngineSelection`, у которого
 * `single`) фасад переводит в него сам — иначе второй флажок снимал бы
 * отметку с первого.
 */
export class TMenuCollectionFacade extends TSelectionCollectionFacade<
	IMenuItem,
	TMenuCollectionExtensions,
	TMenuCollectionFacadeEvents
> {
	constructor(
		props: TCollectionFacadeProps<IMenuItem> = {},
		options: TCollectionFacadeOptions<TMenuCollectionFacadeEngine, IMenu> = {},
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
