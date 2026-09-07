import { TCollectionItemComponent } from '../../../base/collection'
import type { TItemContext } from '../../../base/collection'
import type { TAriaAttributes } from '../../../../common'
import type { TTabsCollectionExtensions } from '../collection/types'
import type { ITabsItem } from '../item/types'

/**
 * Фасад панели таба.
 *
 * Держит `TItemContext` **связанного таба** — того, чьё `value` совпало со
 * значением панели. Отсюда и активность, и ARIA-связка: и то и другое —
 * свойства членства в коллекции, а не самой панели.
 *
 * Ничего не вычисляет сам: активность берёт у адаптера `activation`, атрибуты
 * — у адаптера `content`. Ровно как `TTabsItemCollectionFacade` берёт `closable`
 * у адаптера `tabs`.
 */
export class TTabsContentCollectionFacade extends TCollectionItemComponent<
	ITabsItem,
	TTabsCollectionExtensions
> {
	override setContext(context: TItemContext<ITabsItem, TTabsCollectionExtensions>): void {
		super.setContext(context)

		if (!this._context) return

		this.events.relay(this._context.adapters.activation.events, ['change:active'])
	}

	/** Активен ли связанный таб. Без контекста — нет, панель показывать нечего. */
	get active(): boolean {
		return this._context?.adapters.activation.active ?? false
	}

	/** Связанный таб. */
	get item(): ITabsItem | undefined {
		return this._context?.owner
	}

	/**
	 * Сторона панели в связке: роль, `id` и ссылка на таб.
	 *
	 * Имя с префиксом — как `tab_closable` у элемента: у самой панели есть
	 * унаследованный от `TComponentView` собственный `aria`, и одноимённые
	 * значения из двух контекстов затёрли бы друг друга в шаблоне.
	 */
	get content_aria(): TAriaAttributes {
		return this._context?.adapters.content.panelAria ?? {}
	}
}
