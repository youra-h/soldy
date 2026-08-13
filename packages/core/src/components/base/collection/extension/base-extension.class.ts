import type { IExtension, IExtensionContext } from './types'
import { TEvented } from '@soldy/core'

/**
 * Абстрактное расширение — устраняет повторяющийся код:
 * `events`, `_ctx`, `install()`.
 *
 * @template T      — тип элемента коллекции
 * @template TEvents — тип событий расширения
 */
export abstract class TBaseExtension<
	TItem extends object,
	TEvents extends Record<string, (...args: any) => any>,
> implements IExtension<TItem, TEvents> {
	abstract readonly name: string

	readonly events = new TEvented<TEvents>()

	protected _ctx!: IExtensionContext<TItem>

	install(ctx: IExtensionContext<TItem>): void {
		this._ctx = ctx
	}
}
