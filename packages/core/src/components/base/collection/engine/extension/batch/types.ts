import type { IExtension } from '../types'
import type { TCollectionEngineItemSource } from '../../types'

/** Owner-level props коллекции от batch-расширения (input). Зеркало BatchExtensionContribution. */
export interface IBatchCollectionProps<TItemProps = any, TItem = any> {
	/** Данные для наполнения коллекции: сырые props (+ meta `_`) или готовые инстансы. */
	items?: (TCollectionEngineItemSource<TItemProps> | TItem)[]
	/** Функция идентификации элемента для патчинга (принимает источник или инстанс). */
	trackBy?: (item: TCollectionEngineItemSource<TItem> | TItem) => unknown
}

export type TBatchEvents<TItem> = {
	/** Уходит вход — источники (сырые props + meta `_`) или готовые инстансы, не то, что легло в хранилище. */
	'items:added': (items: TCollectionEngineItemSource<TItem>[]) => void
	'items:removed': (items: TItem[]) => void
	'change:trackBy': (fn?: (item: TCollectionEngineItemSource<TItem> | TItem) => unknown) => void

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
	/** Принимает источник (сырые props + meta `_`) или готовый инстанс. */
	trackBy?: (item: TCollectionEngineItemSource<TItem> | TItem) => unknown

	/**
	 * Состав хранилища — реальные данные. Отбор сюда не вмешивается.
	 */
	get items(): ReadonlyArray<TItem>
	set items(items: TCollectionEngineItemSource<TItem>[])

	/**
	 * Что показано пользователю — выборка после отбора (`items:query:before`).
	 * Отсюда читает всё, что рисует.
	 */
	get shown(): ReadonlyArray<TItem>

	/** Количество элементов в хранилище. Показано — `length`. */
	get total(): number

	/** Сколько элементов показано — после отбора. В хранилище — `total`. */
	get length(): number

	/**
	 * Найти элемент в хранилище. Среди показанных — `shown.find()`.
	 */
	find(predicate: (item: TItem) => boolean): TItem | undefined

	/**
	 * Добавить элементы в коллекцию.
	 * @param items — источники (сырые props + meta `_`) или готовые инстансы.
	 */
	set(items: TCollectionEngineItemSource<TItem>[]): void

	/**
	 * Обновить элементы в коллекции.
	 * @param items — источники (сырые props + meta `_`) или готовые инстансы.
	 */
	update(items: TCollectionEngineItemSource<TItem>[]): void

	/**
	 * Удалить элементы из коллекции.
	 * @param items — элементы для удаления.
	 */
	remove(items: TItem[]): void

	/**
	 * Патчить элементы в коллекцию.
	 * @param items — источники (сырые props + meta `_`) или готовые инстансы.
	 */
	patch(items: TCollectionEngineItemSource<TItem>[]): void

	/**
	 * Очистить коллекцию.
	 */
	clear(): void
}
