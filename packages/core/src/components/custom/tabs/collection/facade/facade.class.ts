import { TActivationCollectionFacade } from '../../../../base/collection'
import type { TCollectionFacadeOptions, TCollectionFacadeProps } from '../../../../base/collection'
import { TABS_EXTENSIONS } from '../factory'
import { createEngineTabs } from '../create'
import { completeEngine } from '../../../../base/collection/create/internal'
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
		options: TCollectionFacadeOptions<TTabsCollectionFacadeEngine, ITabs>,
	) {
		// Движок пришёл снаружи — дособрать до компонента; нет — собрать свой.
		// Здесь, а не в теле: базы трогают расширения в своих конструкторах
		super(
			{},
			{
				engine: options.engine
					? completeEngine(options.engine, TABS_EXTENSIONS(), options.owner)
					: createEngineTabs({ owner: options.owner }),
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
