import type { IStorage } from '../storage'
import type { TEvented } from '@soldy/core'
import type { TCollectionStorageDriverEvents } from '../types'

/**
 * Контекст выполнения команды: хранилище + эмиттер событий движка.
 *
 * Передаётся в {@link ICommand.apply} (мутация + синхронные «before»-хуки)
 * и в {@link ICommand.emitEvents} (уведомления, которые движок откладывает при батче).
 */
export interface ICommandContext<TItem> {
	readonly storage: IStorage<TItem>
	readonly events: TEvented<TCollectionStorageDriverEvents<TItem>>
}

export interface ICommand<TItem> {
	apply(ctx: ICommandContext<TItem>): void
	emitEvents(ctx: ICommandContext<TItem>): void
}

/**
 * Команда чтения состава.
 *
 * Отдельный контракт, а не `ICommand`: у чтения есть результат и нет
 * уведомлений — storage оно не меняет, поэтому и `emitEvents` ему не нужен.
 * Выполняется через `driver.query()`, а не `driver.execute()`.
 */
export interface IQueryCommand<TItem> {
	apply(ctx: ICommandContext<TItem>): void

	/** Результат выборки. Доступен после `apply`. */
	get result(): readonly TItem[]
}
