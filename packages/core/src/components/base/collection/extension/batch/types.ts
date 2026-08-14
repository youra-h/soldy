export type TBatchEvents<T> = {
	'items:added': (items: T[]) => void
	'items:removed': (items: T[]) => void
	'change:trackBy': (fn: (item: T) => any) => void
}

export interface IBatchExtension<TItem extends object = any> {
	trackBy: (item: TItem) => any

	items: TItem[]

	/**
	 * Добавить элементы в коллекцию.
	 * @param items — элементы для добавления.
	 */
	set(items: TItem[]): void

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
