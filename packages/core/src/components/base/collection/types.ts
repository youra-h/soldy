import type { ICommand } from './commands'
import { TEvented } from '@soldy/core'
import { TActionEvent } from '../../../common/event/action-event'

export class TInsertEvent<TItem> extends TActionEvent {
	public _: Record<string, any> = {}

	constructor(private _item: Partial<TItem>) {
		super()

		this.#syncMetadata(this._item)
	}

	get item(): Partial<TItem> {
		return this._item
	}

	set item(value: Partial<TItem>) {
		this._item = value
	}

	#syncMetadata(value: Partial<TItem>): void {
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

export type TEngineEvents<TItem> = {
	/**
	 * Вызывается ПЕРЕД добавлением элемента (до мутации хранилища).
	 * - Изменить `e.item` — подменить элемент (например, item factory).
	 * - Вызвать `e.preventDefault()` — отменить вставку.
	 */
	'item:add:before': (e: TInsertEvent<TItem>) => void

	/** Вызывается при добавлении одного элемента */
	'item:added': (e: TInsertEvent<TItem>) => void

	/** Вызывается при удалении одного элемента */
	'item:removed': (item: TItem) => void

	/** Вызывается при изменении элемента */
	'item:updated': (item: TItem, changes: Partial<TItem>) => void

	/** Вызывается при перемещении элемента */
	'item:moved': (item: TItem, oldIndex: number, newIndex: number) => void

	/** Системные изменения массива элементов */
	'change:items': (items: readonly TItem[]) => void

	/** Изменение количества элементов */
	'change:count': (count: number) => void

	/** Полный сброс или очистка коллекции */
	reset: () => void
}

/**
 * ICollectionEngine предоставляет ТОЛЬКО доступ для чтения к элементам коллекции
 * через интерфейс ReadonlyArray<T> + методы выполнения команд и батчинга.
 */
export interface ICollectionEngine<TItem> extends ReadonlyArray<TItem> {
	readonly events: TEvented<TEngineEvents<TItem>>

	/** Единственный легитимный способ изменить состояние через Engine */
	execute(command: ICommand<TItem>): void

	/** Пакетное выполнение команд */
	batch(action: () => void): void
}

// Описываем тип движка, исключающий мутирующие методы
export type TReadonlyEngineArray<T> = ReadonlyArray<T> & ICollectionEngine<T>

export interface ICollectionCore<TItem, TExtensions extends Record<string, any>> {
	readonly engine: ICollectionEngine<TItem>
	readonly extensions: TExtensions
}
