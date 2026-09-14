import type { IItemExtension, TBaseItemEventsExtension } from './types'
import { TEvented } from '@soldy/core'
import type { TEventSink } from '@soldy/core'

/**
 * Абстрактный item-адаптер — устраняет повторяющийся код конструктора:
 * `_item`, `_parent`.
 *
 * @template TItem   — тип элемента коллекции
 * @template TParent — тип родительского расширения
 */
export abstract class TBaseItemExtension<
	TItem extends object = any,
	TParent = any,
	TEvents extends TBaseItemEventsExtension = TBaseItemEventsExtension,
> implements IItemExtension<TItem, TEvents> {
	readonly events = new TEvented<TEvents>()

	constructor(
		protected readonly _item: TItem,
		protected readonly _parent: TParent,
	) {}

	/**
	 * Очистить собственные события item-адаптера (отписки, middleware, входящие подписки).
	 */
	destroy(): void {
		this._own.emit('destroy')
		this.events.destroy()
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected get _own(): TEventSink<TBaseItemEventsExtension> {
		return this.events
	}
}
