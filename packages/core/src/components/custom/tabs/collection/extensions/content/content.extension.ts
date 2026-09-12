import { TBaseOwnerItemExtension } from '../../../../../base/collection'
import type { IExtension, IExtensionContext } from '../../../../../base/collection'
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
 * Держит формулу идентификаторов связки «таб ↔ панель» и проставляет её
 * сторону таба каждому элементу коллекции. Встречную половину — сторону
 * панели — читает через item-адаптер adapter-слой, когда панель находит
 * свой таб по `value`.
 *
 * Формула в одном месте намеренно: `aria-controls` таба и `id` панели — один
 * и тот же идентификатор, разнеси их, и они однажды разойдутся.
 *
 * Сторона таба пишется при добавлении элемента, а не при появлении панели.
 * Так она попадает в первую же отрисовку — в том числе серверную. Плата за
 * это: `aria-controls` стоит и тогда, когда `Tabs.Content` в разметке нет
 * вовсе. В паттерне вкладок панель обязательна, поэтому выбор в пользу
 * серверной разметки.
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

	/**
	 * `id` элемента с `role="tab"`.
	 *
	 * Основа — `uid` таба: он уникален в рамках сессии, поэтому две группы
	 * табов на странице не столкнутся, даже если значения совпадают.
	 */
	tabId(item: TItem): string {
		return `s-tab-${item.uid}`
	}

	/** `id` элемента с `role="tabpanel"`. Панель берёт его у связанного таба. */
	panelId(item: TItem): string {
		return `s-tabpanel-${item.uid}`
	}

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		ctx.driver.valueOf().forEach((item) => this._linkTab(item))
		ctx.driver.events.on('item:added', (e) => this._linkTab(e.item as TItem))
	}

	private _linkTab(item: TItem): void {
		item.aria.add('id', this.tabId(item))
		item.aria.add('aria-controls', this.panelId(item))
	}
}
