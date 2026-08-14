import type { IStorage } from '../storage'
import type { TEvented } from '@soldy/core'
import type { TEngineEvents } from '../types'

/**
 * Контекст выполнения команды: хранилище + эмиттер событий движка.
 *
 * Передаётся в {@link ICommand.apply} (мутация + синхронные «before»-хуки)
 * и в {@link ICommand.emitEvents} (уведомления, которые движок откладывает при батче).
 */
export interface ICommandContext<T> {
	readonly storage: IStorage<T>
	readonly events: TEvented<TEngineEvents<T>>
}

export interface ICommand<T> {
	apply(ctx: ICommandContext<T>): void
	emitEvents(ctx: ICommandContext<T>): void
}
