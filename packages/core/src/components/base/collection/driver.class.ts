import type { IStorage } from './storage'
import type { ICommand, ICommandContext } from './commands'
import type { TStorageDriverEvents } from './types'
import { TEvented } from '@soldy/core'

// Список мутирующих методов массива JS, которые категорически нельзя вызывать напрямую
const MUTATING_ARRAY_METHODS = new Set([
	'push',
	'pop',
	'shift',
	'unshift',
	'splice',
	'sort',
	'reverse',
	'fill',
	'copyWithin',
])

export class TCollectionStorageDriver<T> {
	[index: number]: T

	private _storage: IStorage<T> // Хранилище элементов коллекции
	private _isBatching = false // Флаг, указывающий, что в данный момент выполняется батч
	private _pendingCommands: ICommand<T>[] = [] // Список команд, которые были выполнены во время батча и должны быть обработаны после его завершения

	public readonly events = new TEvented<TStorageDriverEvents<T>>()

	constructor(storage: IStorage<T>) {
		this._storage = storage

		return new Proxy(this, {
			get(target, prop, receiver) {
				// 1. Если свойство или метод существует прямо в TCollectionStorageDriver (execute, batch, events, _storage) — возвращаем его
				if (prop in target) {
					return Reflect.get(target, prop, receiver)
				}

				// 2. Блокировка мутирующих методов массива
				if (typeof prop === 'string' && MUTATING_ARRAY_METHODS.has(prop)) {
					throw new Error(
						`[TCollectionStorageDriver] Array mutation method "${prop}()" is forbidden on driver. ` +
							`Use commands via driver.execute() or extension methods (e.g. extension.insert()) instead.`,
					)
				}

				// 3. Чтение по числовому индексу (driver[0], driver[1]...)
				if (typeof prop === 'string' && /^\d+$/.test(prop)) {
					return target._storage.items[Number(prop)]
				}

				// 4. Безопасные методы чтения и свойства массива storage.items (length, find, filter, map, includes, Symbol.iterator и т.д.)
				const items = target._storage.items
				const value = Reflect.get(items, prop)

				// Если метод массива (например, items.find, items.filter, items.slice)
				if (typeof value === 'function') {
					return value.bind(items)
				}

				return value
			},
		}) as unknown as TCollectionStorageDriver<T>
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
