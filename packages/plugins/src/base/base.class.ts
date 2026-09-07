import type { IPlugin, IPluginContext, TPluginEvents } from './types'
import { TEvented } from '@soldy/core'

export abstract class TBasePlugin<
	TInstance = any,
	TEvents extends Record<string, (...args: any) => any> = TPluginEvents,
> implements IPlugin<TInstance, TEvents> {
	readonly events: TEvented<TEvents> = new TEvented<TEvents>()

	install(ctx: IPluginContext, options?: any): void {
		;(this.events as unknown as TEvented<TPluginEvents>).emit('install', ctx, options)
	}

	/**
	 * Объявляет плагин доступным снаружи и передаёт подписчику сам плагин.
	 *
	 * Вызывает adapter-слой в тот момент, когда фреймворк уже привязал
	 * обработчики событий. В install это делать нельзя: bundle собирается
	 * раньше, и эмит ушёл бы в пустоту.
	 */
	created(): void {
		;(this.events as unknown as TEvented<TPluginEvents>).emit('create', this)
	}

	destroy(): void {
		;(this.events as unknown as TEvented<TPluginEvents>).emit('destroy', {} as IPluginContext, undefined)
	}
}
