import { TActivationCollectionFacade } from '../../../../base/collection'
import type {
	TCollectionEngine,
	TCollectionFacadeOptions,
	TCollectionFacadeProps,
} from '../../../../base/collection'
import { tabsExtensions } from '../factory'
import { withOwnerIds, completeEngine } from '../../../../base/collection/create/internal'
import type { TTabsCollectionExtensions, TTabsCollectionFacadeEngine } from '../types'
import type { TTabsCollectionFacadeEvents } from '../types'
import type { ITabsItem } from '../../item/types'
import type { ITabs } from '../../types'

/**
 * Фасад коллекции табов.
 *
 * Состав и активный таб приходят из `TActivationCollectionFacade`: у табов не
 * выбор, а активация, и расширения `selection` в наборе нет. Своё — только
 * закрытие вкладок.
 */
export class TTabsCollectionFacade extends TActivationCollectionFacade<
	ITabsItem,
	TTabsCollectionExtensions,
	TTabsCollectionFacadeEvents
> {
	constructor(
		props: TCollectionFacadeProps<ITabsItem> = {},
		options: TCollectionFacadeOptions<TTabsCollectionFacadeEngine, ITabs> = {},
	) {
		// Движок мог прийти снаружи собранным на любом уровне — `completeEngine`
		// доставит в него то, чего не хватает Tabs. Именно здесь, а не в теле: базы
		// трогают расширения в своих конструкторах
		super(
			{},
			{
				engine: withOwnerIds(
					completeEngine(options.engine, tabsExtensions()),
					options.owner,
				) as TCollectionEngine<ITabsItem, TTabsCollectionExtensions>,
				owner: options.owner,
			},
		)

		if (!options.engine) this.bindOwner()

		this.events.relayAll(this.extensions.tabs.events)

		this.applyProps(props)
	}

	get closable(): boolean {
		return this.extensions.tabs.closable
	}

	closeTab(item: ITabsItem): void {
		this.extensions.tabs.closeTab(item)
	}
}
