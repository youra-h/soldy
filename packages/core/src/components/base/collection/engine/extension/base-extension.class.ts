import type { IExtension, IExtensionContext } from './types'
import type { TEngineOptions } from '../options'
import { TEvented } from '@soldy-ui/core'

/**
 * Абстрактное расширение — устраняет повторяющийся код:
 * `events`, `_ctx`, `install()`.
 *
 * @template T        — тип элемента коллекции
 * @template TEvents  — тип событий расширения
 * @template TOptions — опции движка, которые расширение читает
 */
export abstract class TBaseExtension<
	TItem extends object,
	TEvents extends Record<string, (...args: any) => any>,
	TOptions extends TEngineOptions = TEngineOptions,
> implements IExtension<TItem, TEvents> {
	abstract readonly name: string

	readonly events = new TEvented<TEvents>()

	protected _ctx!: IExtensionContext<TItem, TOptions>

	install(ctx: IExtensionContext<TItem, TOptions>): void {
		this._ctx = ctx
	}
}
