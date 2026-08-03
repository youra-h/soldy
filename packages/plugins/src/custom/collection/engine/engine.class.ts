import type { IStorage } from './storage'
import type { ICommand } from './command'
import type { TEngineEvents, ICollectionEngine } from './types'
import { TEvented } from '@soldy/core'

export class TCollectionEngine<T> implements ICollectionEngine<T> {
	[index: number]: T

	private _storage: IStorage<T> // Хранилище элементов коллекции
	private _isBatching = false // Флаг, указывающий, что в данный момент выполняется батч
	private _pendingCommands: ICommand<T>[] = [] // Список команд, которые были выполнены во время батча и должны быть обработаны после его завершения

	public readonly events = new TEvented<TEngineEvents<T>>()

	constructor(storage: IStorage<T>) {
		this._storage = storage

		return new Proxy(this, {
			get(target, prop, receiver) {
				if (prop in target) {
					return Reflect.get(target, prop, receiver)
				}

				if (typeof prop === 'string' && /^\d+$/.test(prop)) {
					return target._storage.items[Number(prop)]
				}

				const items = target._storage.items
				const value = Reflect.get(items, prop)

				if (typeof value === 'function') {
					return value.bind(items)
				}

				return value
			},
		}) as unknown as TCollectionEngine<T>
	}

	/**
	 * Выполняет команду над коллекцией. Если в данный момент выполняется батч, то события не эмитятся сразу, а откладываются до конца батча.
	 * @param command Команда для выполнения
	 */
	public execute(command: ICommand<T>): void {
		command.apply(this._storage)

		if (!this._isBatching) {
			command.emitEvents(this.events, this._storage)
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

				commandsToEmit.forEach((cmd) => cmd.emitEvents(this.events, this._storage))

				this.events.emit('change:items', this._storage.items)
			}
		}
	}
}
