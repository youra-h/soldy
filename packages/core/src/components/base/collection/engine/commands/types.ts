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

	/**
	 * Изменила ли команда состав хранилища. Достоверно только после `apply`.
	 *
	 * Читается драйвером одинаково для всех команд — чтобы решить, слать ли
	 * `change:items`. Не про уведомления конкретной команды (это `emitEvents`),
	 * а про факт мутации `storage`.
	 */
	get changed(): boolean

	/**
	 * Изменила ли команда последовательность элементов в storage. Достоверно
	 * только после `apply`. Если флаг поднят, `changed` тоже истинно —
	 * последовательность не может смениться без изменения состава.
	 *
	 * Читается драйвером, чтобы решить, слать ли `change:order` вдобавок к
	 * `change:items`. Обновление свойств элемента (`TUpdateCommand`) состав
	 * меняет, но порядок — никогда, поэтому у него отдельный флаг: `changed`
	 * для `change:items`/`change:shown` остаётся как есть, а `change:order`
	 * реагирует только на факт перестановки.
	 */
	get orderChanged(): boolean
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
