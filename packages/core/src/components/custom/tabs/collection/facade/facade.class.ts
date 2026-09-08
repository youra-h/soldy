import { TBatchCollectionFacade } from '../../../../base/collection'
import type { TCollectionFacadeOptions, TCollectionFacadeProps } from '../../../../base/collection'
import { TabsFactory } from '../factory'
import type { TTabsCollection, TTabsCollectionExtensions } from '../types'
import type { ITabsItem } from '../../item/types'
import type { ITabs } from '../../types'

/**
 * Фасад коллекции табов.
 *
 * Наследует только `TBatchCollectionFacade`: у табов не выбор, а активация,
 * и расширения `selection` в наборе нет. Базы под активацию пока нет —
 * реализация одна, и заводить её под единственного потребителя значило бы
 * подстраиваться под ещё неизвестное требование.
 */
export class TTabsCollectionFacade extends TBatchCollectionFacade<
	ITabsItem,
	TTabsCollectionExtensions
> {
	constructor(
		props: TCollectionFacadeProps<ITabsItem> = {},
		options: TCollectionFacadeOptions<TTabsCollection, ITabs> = {},
	) {
		super({}, { engine: options.engine ?? TabsFactory(options.owner!) })

		this.events.relay(this.extensions.activation.events, [
			'change:activation',
			'item:activated',
			'item:deactivated',
		])

		this.events.relay(this.extensions.tabs.events, ['item:close', 'change:closable'])

		this.applyProps(props)
	}

	get activeItem(): ITabsItem | undefined {
		return this.extensions.activation.activeItem
	}

	get closable(): boolean {
		return this.extensions.tabs.closable
	}

	activate(item: ITabsItem): void {
		this.extensions.activation.activate(item)
	}

	closeTab(item: ITabsItem): void {
		this.extensions.tabs.closeTab(item)
	}
}
