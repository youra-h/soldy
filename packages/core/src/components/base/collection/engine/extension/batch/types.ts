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

	/**
	 * Показанное изменилось — из-за состава или из-за условий отбора.
	 * Без аргументов: читателю нужно перечитать `shown`.
	 */
	'change:shown': () => void
}

export interface IBatchExtension<TItem extends object = any> extends IExtension<
	TItem,
	TBatchEvents<TItem>
> {
	trackBy?: (item: TItem) => any

	/**
	 * Состав хранилища — реальные данные. Отбор сюда не вмешивается.
	 */
	get items(): ReadonlyArray<TItem>
	set items(items: TItem[])

	/**
	 * Что показано пользователю — выборка после отбора (`items:query:before`).
	 * Отсюда читает всё, что рисует.
	 */
	get shown(): ReadonlyArray<TItem>

	/** Количество элементов в хранилище. Показано — `shown.length`. */
	get length(): number

	/**
	 * Найти элемент в хранилище. Среди показанных — `shown.find()`.
	 */
	find(predicate: (item: TItem) => boolean): TItem | undefined

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
