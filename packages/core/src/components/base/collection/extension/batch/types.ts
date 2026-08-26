import type { TReadonlyEngineArray } from '../../types'

/** Owner-level props коллекции от batch-расширения. Зеркало BatchExtensionContribution. */
export interface IBatchCollectionProps<TItem = any> {
	/** Данные для наполнения коллекции. */
	items?: TItem[]
	/** Функция идентификации элемента для патчинга. */
	trackBy?: (item: TItem) => any
}

export type TBatchEvents<T> = {
	'items:added': (items: T[]) => void
	'items:removed': (items: T[]) => void
	'change:trackBy': (fn?: (item: T) => any) => void
	'change:items': (items: T[]) => void
}

export interface IBatchExtension<TItem extends object = any> {
	trackBy?: (item: TItem) => any

	get items(): TReadonlyEngineArray<TItem>
	set items(items: TItem[])

	/**
	 * Добавить элементы в коллекцию.
	 * @param items — элементы для добавления.
	 */
	set(items: TItem[]): void

	/**
	 * Обновить элементы в коллекции.
	 * @param items — элементы для обновления.
	 */
	update(items: TItem[]): void

	/**
	 * Удалить элементы из коллекции.
	 * @param items — элементы для удаления.
	 */
	remove(items: TItem[]): void

	/**
	 * Патчить элементы в коллекцию.
	 * @param items — элементы для патчинга.
	 */
	patch(items: TItem[]): void

	/**
	 * Очистить коллекцию.
	 */
	clear(): void
}
