import type { IStorage } from './storage'
import type { ICommand, ICommandContext, IQueryCommand } from './commands'
import type { TCollectionStorageDriverEvents } from './types'
import { TEvented } from '@soldy/core'

export class TCollectionStorageDriver<T> {
	private _storage: IStorage<T> // Хранилище элементов коллекции
	private _isBatching = false // Флаг, указывающий, что в данный момент выполняется батч
	private _pendingCommands: ICommand<T>[] = [] // Список команд, которые были выполнены во время батча и должны быть обработаны после его завершения

	public readonly events = new TEvented<TCollectionStorageDriverEvents<T>>()

	constructor(storage: IStorage<T>) {
		this._storage = storage
	}

	/**
	 * Снимок сырого состава хранилища.
	 *
	 * Единственное чтение, которое драйвер отдаёт без команды — и это
	 * осознанно: тем, кто пишет в хранилище (расширения), нужен состав как он
	 * есть, без выборки. Всё, что показывается наружу, идёт через
	 * `query()` — там подписчик может его подменить.
	 *
	 * Копия, а не живая ссылка на `storage.items`: иначе состав менялся бы под
	 * тем, кто его уже получил. Заодно это конвенция `accessor.getValue()`,
	 * которая зовёт `valueOf()`.
	 */
	public valueOf(): T[] {
		return [...this._storage.items]
	}

	/**
	 * Выполняет команду над коллекцией. Если в данный момент выполняется батч, то события не эмитятся сразу, а откладываются до конца батча.
	 * @param command Команда для выполнения
	 */
	public execute(command: ICommand<T>): void {
		// apply отвечает за мутацию и синхронные «before»-хуки (например, item factory).
		// Выполняется всегда сразу, в том числе внутри батча.
		const ctx: ICommandContext<T> = { storage: this._storage, events: this.events }

		command.apply(ctx)

		if (!this._isBatching) {
			command.emitEvents(ctx)
			this.events.emit('change:items', this._storage.items)
		} else {
			this._pendingCommands.push(command)
		}
	}

	/**
	 * Выполняет читающую команду и возвращает выборку.
	 *
	 * Отдельно от `execute`, а не режимом внутри него: запись уведомляет об
	 * изменении состава, чтение — нет. Батчинг тоже ни при чём — откладывать
	 * нечего, результат нужен сразу.
	 *
	 * @param command Читающая команда
	 */
	public query(command: IQueryCommand<T>): readonly T[] {
		const ctx: ICommandContext<T> = { storage: this._storage, events: this.events }

		command.apply(ctx)

		return command.result
	}

	/**
	 * Пометить прежнюю выборку недействительной.
	 *
	 * Драйвер не знает, кто и по какому правилу отбирает — он лишь передаёт
	 * дальше, что спрашивать надо заново. Отдельно от `change:items`: состав
	 * хранилища не менялся, и путать эти два факта нельзя.
	 */
	public invalidateQuery(): void {
		this.events.emit('items:query:invalidated')
	}

	/**
	 * Выполняет действие в режиме батча. Все команды, выполненные внутри действия, будут отложены до конца батча и события будут эмититься только один раз.
	 * @param action Действие, выполняемое в режиме батча.
	 */
	public batch(action: () => void): void {
		const wasBatching = this._isBatching
		this._isBatching = true

		try {
			action()
		} finally {
			this._isBatching = wasBatching

			if (!this._isBatching && this._pendingCommands.length > 0) {
				const commandsToEmit = [...this._pendingCommands]
				this._pendingCommands = []

				commandsToEmit.forEach((cmd) =>
					cmd.emitEvents({ storage: this._storage, events: this.events }),
				)

				this.events.emit('change:items', this._storage.items)
			}
		}
	}
}
