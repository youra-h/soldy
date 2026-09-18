import { TActivationCollectionFacade } from '../../../../base/collection'
import type { TCollectionFacadeOptions, TCollectionFacadeProps } from '../../../../base/collection'
import { TabsFactory, TABS_EXTENSIONS, TABS_OWNER_EXTENSIONS } from '../factory'
import { resolveEngine } from '../../../../base/collection/create/internal'
import type {
	TTabsCollection,
	TTabsCollectionExtensions,
	TTabsCollectionFacadeEngine,
} from '../types'
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
		// Движок мог прийти снаружи собранным на любом уровне — `resolveEngine`
		// дополнит его до того, что нужно Tabs. Именно здесь, а не в теле: базы
		// трогают расширения в своих конструкторах
		super(
			{},
			{
				engine: resolveEngine(
					options,
					TABS_EXTENSIONS(),
					TABS_OWNER_EXTENSIONS,
					'Tabs',
					TabsFactory,
				) as TTabsCollection,
			},
		)

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
