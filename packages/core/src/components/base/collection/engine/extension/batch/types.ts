import type { IExtension } from '../types'
import type { TCollectionEngineItemSource } from '../../types'

/** Owner-level props коллекции от batch-расширения (input). Зеркало BatchExtensionContribution. */
export interface IBatchCollectionProps<TItemProps = any, TItem = any> {
	/** Данные для наполнения коллекции: сырые props (+ meta `_`) или готовые инстансы. */
	items?: (TCollectionEngineItemSource<TItemProps> | TItem)[]
	/** Функция идентификации элемента для патчинга (принимает инстанс). */
	trackBy?: (item: TItem) => any
}

export type TBatchEvents<TItem> = {
	'items:added': (items: TItem[]) => void
	'items:removed': (items: TItem[]) => void
	'change:trackBy': (fn?: (item: TItem) => any) => void
	'change:items': (items: TItem[]) => void
}

export interface IBatchExtension<TItem extends object = any> extends IExtension<
	TItem,
	TBatchEvents<TItem>
> {
	trackBy?: (item: TItem) => any

	/**
	 * Элементы коллекции для чтения — единственный легитимный способ получить
	 * список вне расширений коллекции. Тип сознательно `ReadonlyArray`, а не
	 * `TReadonlyStorageDriverArray`: driver-методы (`execute`, `events`) сюда не
	 * протаскиваются — иначе обёртка над driver была бы дырявой.
	 */
	get items(): ReadonlyArray<TItem>
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
