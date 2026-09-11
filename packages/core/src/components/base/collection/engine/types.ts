import type { ICommand } from './commands'
import { TEvented } from '@soldy/core'
import { TActionEvent } from '../../../../common/event/action-event'

/**
 * База событий коллекции, которые несут meta-снапшот `_`.
 * Мета снимается с сырого источника в конструкторе — до любых `*:before`-хендлеров,
 * поэтому factory-подмена item не влияет на уже захваченный `_`.
 */
// Параметр держит арность дженерика: наследники передают TItem явно.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export abstract class TItemEvent<TItem = any> extends TActionEvent {
	public _: Record<string, any> = {}

	protected captureMeta(source: unknown): void {
		if (typeof source === 'object' && source !== null && '_' in source) {
			const meta = (source as Record<string, unknown>)._

			if (typeof meta === 'object' && meta !== null) {
				this._ = meta as Record<string, unknown>
				return
			}
		}

		this._ = {}
	}
}

export class TInsertEvent<TItem> extends TItemEvent<TItem> {
	constructor(private _item: Partial<TItem>) {
		super()

		this.captureMeta(this._item)
	}

	get item(): Partial<TItem> {
		return this._item
	}

	set item(value: Partial<TItem>) {
		this._item = value
	}
}

export class TUpdateEvent<TItem> extends TItemEvent<TItem> {
	/** changes без `_` — то, что реально пойдёт в Object.assign. */
	readonly changes: Partial<TItem>

	constructor(
		public item: TItem,
		source: Partial<TItem>,
	) {
		super()

		this.captureMeta(source)

		// отделяем meta от данных, чтобы `_` не «прилип» к item при Object.assign
		const changes = { ...(source as Record<string, unknown>) }
		delete changes._

		this.changes = changes as Partial<TItem>
	}
}

/**
 * Проектор: получает текущую проекцию и возвращает новую того же типа.
 *
 * Может сузить состав (фильтр), переставить (сортировка) или подменить
 * представление элемента (Proxy-обёртка) — состав, порядок и представление
 * равноправны, это забота конкретного проектора, а не слоя.
 */
export type TProjector<T> = (items: readonly T[], ctx: IProjectionContext<T>) => readonly T[]

/**
 * Контекст, который driver передаёт проектору при пересчёте.
 *
 * `link` нужен только тем проекторам, что подменяют ссылку (Proxy-обёртка).
 * Проектор, работающий только с составом или порядком (фильтр, сортировка),
 * его не зовёт — идентичность и так цела.
 */
export interface IProjectionContext<T> {
	/** Сообщить, что `projected` представляет `source`. Не звать, если ссылки те же. */
	link(projected: T, source: T): void
}

/** Реестр проекторов driver'а — один на коллекцию. */
export interface IProjectorRegistry<T> {
	/** Зарегистрировать проектор. Возвращает отписку. */
	use(projector: TProjector<T>): () => void
	/** Пометить текущую проекцию устаревшей — пересчёт лениво, на следующее чтение `projection`. */
	invalidate(): void
}

export type TCollectionStorageDriverEvents<TItem> = {
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

	/** Вызывается ПЕРЕД изменением элемента (до мутации). Можно подменить `e.item`/`e.changes` или `preventDefault()`. */
	'item:update:before': (e: TUpdateEvent<TItem>) => void

	/** Вызывается при изменении одного элемента */
	'item:updated': (e: TUpdateEvent<TItem>) => void

	/** Вызывается при перемещении элемента */
	'item:moved': (item: TItem, oldIndex: number, newIndex: number) => void

	/** Системные изменения массива элементов */
	'change:items': (items: readonly TItem[]) => void

	/** Изменение количества элементов */
	'change:count': (count: number) => void

	/** Полный сброс или очистка коллекции */
	reset: () => void

	/**
	 * Проекция пересчитана или помечена устаревшей. Без аргументов: то, что
	 * рисует, перечитывает через `driver.projection`, а не получает payload.
	 *
	 * Не путать с `change:items` — на смену проекции `_selected` в
	 * `TSelectionExtension` не чистится (там подписка именно на `change:items`).
	 */
	'change:projection': () => void
}

/**
 * ICollectionStorageDriver предоставляет ТОЛЬКО доступ для чтения к элементам коллекции
 * через интерфейс ReadonlyArray<T> + методы выполнения команд и батчинга.
 */
export interface ICollectionStorageDriver<TItem> extends ReadonlyArray<TItem> {
	readonly events: TEvented<TCollectionStorageDriverEvents<TItem>>

	/** Единственный легитимный способ изменить состояние через StorageDriver */
	execute(command: ICommand<TItem>): void

	/** Пакетное выполнение команд */
	batch(action: () => void): void

	/** Реестр проекторов — общий слой middleware над сырым составом. */
	readonly projectors: IProjectorRegistry<TItem>

	/**
	 * Результат цепочки проекторов. Кэшируется между инвалидациями — стабильная
	 * ссылка на массив нужна аксессору, иначе UI перерисовывался бы на каждое
	 * чтение. Пустой реестр отдаёт то же, что `valueOf()`.
	 */
	readonly projection: readonly TItem[]

	/** Проецированный элемент → исходный из storage. Без подмены ссылки — тождество. */
	canonical(item: TItem): TItem
}

// Описываем тип движка, исключающий мутирующие методы
export type TReadonlyStorageDriverArray<T> = ReadonlyArray<T> & ICollectionStorageDriver<T>

export interface ICollectionEngineCore<TItem, TExtensions extends Record<string, any>> {
	readonly driver: ICollectionStorageDriver<TItem>
	readonly extensions: TExtensions
}

/**
 * Pass-through проп готовой коллекции. Зеркало CollectionContribution.
 * Аналог `ctrl` для компонентов: если задан — используется вместо создания новой коллекции.
 */
export interface ICollectionProps<TCollectionEngine = unknown> {
	engine?: TCollectionEngine
}

/**
 * Сырой источник элемента коллекции: props + опциональная meta `_`.
 * Используется для `items` — состояния (active, selected) передаются через `_.{state}`.
 */
export type TCollectionEngineItemSource<
	TItemProps = any,
	TMeta = Record<string, any>,
> = Partial<TItemProps> & {
	_?: TMeta
}

/**
 * События движка коллекции (TCollectionEngine).
 * Позволяют получить ссылку на движок в момент его создания.
 */
export type TCollectionEngineEvents<TEngine = unknown> = {
	/** Движок создан и готов к использованию. Передаётся сам движок. */
	'engine:create': (engine: TEngine) => void
}
