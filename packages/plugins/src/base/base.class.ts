import type { IPlugin, IPluginContext, TPluginEvents } from './types'
import { TEvented } from '@soldy/core'
import type { TEventSink } from '@soldy/core'

export abstract class TBasePlugin<
	TInstance = any,
	TEvents extends TPluginEvents = TPluginEvents,
> implements IPlugin<TInstance, TEvents> {
	readonly events: TEvented<TEvents> = new TEvented<TEvents>()

	install(ctx: IPluginContext, options?: unknown): void {
		this._sink.emit('install', ctx, options)
	}

	/**
	 * Объявляет плагин доступным снаружи и передаёт подписчику сам плагин.
	 *
	 * Вызывает adapter-слой в тот момент, когда фреймворк уже привязал
	 * обработчики событий. В install это делать нельзя: bundle собирается
	 * раньше, и эмит ушёл бы в пустоту.
	 */
	created(): void {
		this._sink.emit('create', this)
	}

	destroy(): void {
		this._sink.emit('destroy')
	}

	/**
	 * Эмит собственных событий базы — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `@soldy/core`). Эмит звучит за
	 * счёт констрейнта: карта наследника включает `TPluginEvents`.
	 */
	protected get _sink(): TEventSink<TPluginEvents> {
		return this.events
	}
}
