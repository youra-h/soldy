import type { IItemExtension } from './types'
import { TEvented } from '@soldy/core'

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
	TEvents extends Record<string, (...args: any) => any> = Record<string, (...args: any) => any>,
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
		this.events.destroy()
	}
}
