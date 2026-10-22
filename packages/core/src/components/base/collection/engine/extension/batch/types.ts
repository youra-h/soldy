import type { IExtension } from '../types'
import type { TCollectionEngineItemSource } from '../../types'

/** Owner-level props коллекции от batch-расширения (input). Зеркало `CollectionDescriptor` (setup). */
export interface IBatchCollectionProps<TItemProps = any, TItem = any> {
	/**
	 * Данные для наполнения коллекции: сырые props (+ meta `_`) или готовые
	 * инстансы. Массив только для чтения: коллекция его не меняет.
	 */
	items?: ReadonlyArray<TCollectionEngineItemSource<TItemProps> | TItem>
	/** Функция идентификации элемента для патчинга (принимает источник или инстанс). */
	trackBy?: (item: TCollectionEngineItemSource<TItem> | TItem) => unknown
}

export type TBatchEvents<TItem> = {
	/**
	 * Уходит вход — источники (сырые props + meta `_`) или готовые инстансы, не
	 * то, что легло в хранилище. Тот же массив, что дали операции, поэтому
	 * только для чтения.
	 */
	'items:added': (items: ReadonlyArray<TCollectionEngineItemSource<TItem>>) => void
	/** Уходит вход `remove` — тот же массив, только для чтения; у `clear` — пустой. */
	'items:removed': (items: ReadonlyArray<TItem>) => void
	'change:trackBy': (fn?: (item: TCollectionEngineItemSource<TItem> | TItem) => unknown) => void

	/**
	 * Показанное изменилось — из-за состава или из-за условий отбора.
	 * Без аргументов: читателю нужно перечитать `shown`.
	 */
	'change:shown': () => void
}

/**
 * Пакетные операции над составом.
 *
 * Вход операций — массив только для чтения: ни они, ни команда сверки его не
 * меняют, а только проходят. Поэтому состав, объявленный константой, уходит
 * сюда без копии.
 */
export interface IBatchExtension<TItem extends object = any> extends IExtension<
	TItem,
	TBatchEvents<TItem>
> {
	/** Принимает источник (сырые props + meta `_`) или готовый инстанс. */
	trackBy?: (item: TCollectionEngineItemSource<TItem> | TItem) => unknown

	/**
	 * Состав хранилища — реальные данные. Отбор сюда не вмешивается. Запись —
	 * `update`, если состав другой.
	 */
	get items(): ReadonlyArray<TItem>
	set items(items: ReadonlyArray<TCollectionEngineItemSource<TItem>>)

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
	set(items: ReadonlyArray<TCollectionEngineItemSource<TItem>>): void

	/**
	 * Заменить состав. С `trackBy` — сверка (`patch`): несовпавшие снимаются,
	 * кроме удержанных (`hold`). Без `trackBy` — пересборка `clear()` + `set()`:
	 * она снимает всех, удержанных тоже.
	 * @param items — источники (сырые props + meta `_`) или готовые инстансы.
	 */
	update(items: ReadonlyArray<TCollectionEngineItemSource<TItem>>): void

	/**
	 * Удалить элементы из коллекции. Удержанные (`hold`) — тоже.
	 * @param items — элементы для удаления.
	 */
	remove(items: ReadonlyArray<TItem>): void

	/**
	 * Сверить состав с входом по ключу `trackBy`: совпавшие обновляются на
	 * месте, новые добавляются в конец, несовпавшие снимаются — кроме
	 * удержанных (`hold`). Совпадения ищутся по всему составу, поэтому
	 * удержанный с ключом из входа обновляется, а не дублируется.
	 * @param items — источники (сырые props + meta `_`) или готовые инстансы.
	 */
	patch(items: ReadonlyArray<TCollectionEngineItemSource<TItem>>): void

	/**
	 * Удержать элемент состава от сверки по ключу: `patch` и `items =` с
	 * `trackBy` его не снимают, даже когда его ключа во входе нет. Элемент
	 * разметки держит его регистратор, пока элемент в разметке: состав таких
	 * элементов задаёт шаблон, а не данные.
	 *
	 * - Держит только элемент состава: вне его вызов ничего не держит.
	 * - Уход из состава снимает удержание: вернувшийся элемент не удержан, пока
	 *   его не удержат снова.
	 * - Явное удаление удержание не отменяет: `remove`, `plain.remove`, `clear`
	 *   и замена без `trackBy` снимают и удержанный.
	 * - Удержаний у элемента бывает несколько: он удержан, пока не отпущено
	 *   последнее.
	 *
	 * @returns «отпустить» — снимает это удержание; повторный вызов ничего не делает.
	 */
	hold(item: TItem): () => void

	/**
	 * Очистить коллекцию. Удержанные (`hold`) — тоже.
	 */
	clear(): void
}
