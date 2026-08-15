import type { ICommand } from './commands'
import { TEvented } from '@soldy/core'
import { TActionEvent } from '../../../common/event/action-event'

export class TInsertEvent<T> extends TActionEvent {
	public _: Record<string, any> = {}

	constructor(private _item: T) {
		super()

		this.#syncMetadata(this._item)
	}

	get item(): T {
		return this._item
	}

	set item(value: T) {
		this._item = value
	}

	#syncMetadata(value: T): void {
		if (typeof value === 'object' && value !== null && '_' in value) {
			const meta = (value as Record<string, unknown>)._

			if (typeof meta === 'object' && meta !== null) {
				this._ = meta as Record<string, unknown>
				return
			}
		}

		this._ = {}
	}
}

export type TEngineEvents<T> = {
	/**
	 * Вызывается ПЕРЕД добавлением элемента (до мутации хранилища).
	 * - Изменить `e.item` — подменить элемент (например, item factory).
	 * - Вызвать `e.preventDefault()` — отменить вставку.
	 */
	'item:add:before': (e: TInsertEvent<T>) => void

	/** Вызывается при добавлении одного элемента */
	'item:added': (e: TInsertEvent<T>) => void

	/** Вызывается при удалении одного элемента */
	'item:removed': (item: T) => void

	/** Вызывается при изменении элемента */
	'item:updated': (item: T, changes: Partial<T>) => void

	/** Вызывается при перемещении элемента */
	'item:moved': (item: T, oldIndex: number, newIndex: number) => void

	/** Системные изменения массива элементов */
	'change:items': (items: readonly T[]) => void

	/** Изменение количества элементов */
	'change:count': (count: number) => void

	/** Полный сброс или очистка коллекции */
	reset: () => void
}

/**
 * ICollectionEngine предоставляет ТОЛЬКО доступ для чтения к элементам коллекции
 * через интерфейс ReadonlyArray<T> + методы выполнения команд и батчинга.
 */
export interface ICollectionEngine<T> extends ReadonlyArray<T> {
	readonly events: TEvented<TEngineEvents<T>>

	/** Единственный легитимный способ изменить состояние через Engine */
	execute(command: ICommand<T>): void

	/** Пакетное выполнение команд */
	batch(action: () => void): void
}

export interface ICollectionCore<T, TExtensions extends Record<string, any>> {
	readonly engine: ICollectionEngine<T>
	readonly extensions: TExtensions
}
