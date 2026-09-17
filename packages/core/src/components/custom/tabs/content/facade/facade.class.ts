import { TCollectionItemComponent } from '../../../../base/collection'
import type { TItemContext } from '../../../../base/collection'
import type {
	TTabsCollectionExtensions,
	TTabsContentCollectionFacadeEvents,
} from '../../collection/types'
import type { ITabsItem } from '../../item/types'

/**
 * Фасад панели таба.
 *
 * Держит `TItemContext` **связанного таба** — того, чьё `value` совпало со
 * значением панели. Отсюда и активность: это свойство членства в коллекции, а
 * не самой панели.
 *
 * Ничего не вычисляет сам: активность берёт у адаптера `activation` — ровно
 * как `TTabsItemCollectionFacade` берёт `closable` у адаптера `tabs`. Атрибутов
 * связки фасад не отдаёт: сторону панели из адаптера `content` кладёт прямо в
 * `aria` панели `TTabsContentBindingExtension`.
 */
export class TTabsContentCollectionFacade extends TCollectionItemComponent<
	ITabsItem,
	TTabsCollectionExtensions,
	TTabsContentCollectionFacadeEvents
> {
	override setContext(context: TItemContext<ITabsItem, TTabsCollectionExtensions>): void {
		super.setContext(context)

		if (!this._context) return

		this.events.relayAll(this._context.adapters.activation.events)
	}

	/** Активен ли связанный таб. Без контекста — нет, панель показывать нечего. */
	get active(): boolean {
		return this._context?.adapters.activation.active ?? false
	}

	/** Связанный таб. */
	get item(): ITabsItem | undefined {
		return this._context?.owner
	}
}
