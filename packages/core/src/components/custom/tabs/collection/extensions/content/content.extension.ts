import { TBaseOwnerItemExtension } from '../../../../../base/collection'
import type { IExtension } from '../../../../../base/collection'
import type { ITabsItem } from '../../../item/types'
import { TTabsContentItemExtension, type ITabsContentItemExtension } from './item'
import type {
	ITabsContentExtension,
	ITabsContentExtensionOptions,
	TTabsContentExtensionEvents,
} from './types'

/**
 * TTabsContentExtension — расширение коллекции под панели табов.
 *
 * Само по себе ничего не хранит: его задача — дать каждому элементу
 * item-адаптер, который посчитает связку «таб ↔ панель». Владелец здесь не
 * нужен, в отличие от TTabsExtension: связка строится от элемента, а не от
 * инстанса TTabs.
 *
 * Панель находит свой таб по совпадению `value` (это делает adapter-слой) и
 * берёт его контекст — дальше `adapters.content.panelAria` отдаёт атрибуты.
 * Сам таб через `adapters.content.tabAria` получает встречную половину.
 */
export class TTabsContentExtension<TItem extends ITabsItem = ITabsItem>
	extends TBaseOwnerItemExtension<
		TItem,
		ITabsContentItemExtension<TItem>,
		TTabsContentExtensionEvents
	>
	implements IExtension<TItem>, ITabsContentExtension<TItem>
{
	readonly name = 'content' as const

	constructor(options?: ITabsContentExtensionOptions<TItem>) {
		super(TTabsContentItemExtension as any, options)
	}
}
