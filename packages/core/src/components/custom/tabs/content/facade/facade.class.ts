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
 * как `TTabsItemCollectionFacade` берёт закрываемость у адаптера `tabs`.
 * Атрибутов связки фасад не отдаёт: сторону панели из адаптера `content`
 * кладёт прямо в `aria` панели `TTabsContentBindingExtension`.
 *
 * Сам фасад сообщает об одном — о смене активности от смены контекста.
 * Контекст у панели меняется, пока она смонтирована: `value` привело её к
 * другому табу или ни к какому. Адаптер активации нового таба о прежнем не
 * знает, а связка, которая меняет контекст, не знает, от чего зависит
 * `active`. «Было/стало» поэтому считает тот, кто считает итог.
 */
export class TTabsContentCollectionFacade extends TCollectionItemComponent<
	ITabsItem,
	TTabsCollectionExtensions,
	TTabsContentCollectionFacadeEvents
> {
	override setContext(context: TItemContext<ITabsItem, TTabsCollectionExtensions>): void {
		const wasActive = this.active

		super.setContext(context)

		this.events.relayAll(context.adapters.activation.events)

		this._emitActiveIfChanged(wasActive)
	}

	/**
	 * Таба с `value` панели нет или монтирование кончилось: панели показывать
	 * нечего, и о прежнем табе она больше не отвечает.
	 */
	override clearContext(): void {
		const wasActive = this.active

		super.clearContext()

		this._emitActiveIfChanged(wasActive)
	}

	/** Активен ли связанный таб. Без контекста — нет, панель показывать нечего. */
	get active(): boolean {
		return this._context?.adapters.activation.active ?? false
	}

	/** Связанный таб. */
	get item(): ITabsItem | undefined {
		return this._context?.owner
	}

	private _emitActiveIfChanged(wasActive: boolean): void {
		if (this.active !== wasActive) this.events.emit('change:active')
	}
}
