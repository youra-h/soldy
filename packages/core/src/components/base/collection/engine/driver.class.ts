import type { IStorage } from './storage'
import type { ICommand, ICommandContext } from './commands'
import type {
	TCollectionStorageDriverEvents,
	TProjector,
	IProjectionContext,
	IProjectorRegistry,
} from './types'
import { TEvented } from '@soldy/core'

// Список мутирующих методов массива JS, которые категорически нельзя вызывать напрямую
const MUTATING_ARRAY_METHODS = new Set([
	'push',
	'pop',
	'shift',
	'unshift',
	'splice',
	'sort',
	'reverse',
	'fill',
	'copyWithin',
])

export class TCollectionStorageDriver<T> {
	[index: number]: T

	private _storage: IStorage<T> // Хранилище элементов коллекции
	private _isBatching = false // Флаг, указывающий, что в данный момент выполняется батч
	private _pendingCommands: ICommand<T>[] = [] // Список команд, которые были выполнены во время батча и должны быть обработаны после его завершения

	// Слой проекции: цепочка проекторов, ленивый кэш результата и карта
	// «проецированный элемент → исходный», заполняемая проекторами через ctx.link().
	private _projectors: TProjector<T>[] = []
	private _projectionCache: readonly T[] | null = null
	private _canonicalMap = new WeakMap<object, T>()

	public readonly events = new TEvented<TCollectionStorageDriverEvents<T>>()

	public readonly projectors: IProjectorRegistry<T>

	constructor(storage: IStorage<T>) {
		this._storage = storage

		this.projectors = {
			use: (projector: TProjector<T>) => {
				this._projectors.push(projector)
				this._invalidateProjection()

				return () => {
					const index = this._projectors.indexOf(projector)

					if (index === -1) return

					this._projectors.splice(index, 1)
					this._invalidateProjection()
				}
			},
			invalidate: () => this._invalidateProjection(),
		}

		// Состав изменился — проекция устарела. Один `change:items` на батч
		// (см. execute/batch ниже) даёт ровно один `change:projection`.
		this.events.on('change:items', () => this._invalidateProjection())

		return new Proxy(this, {
			get(target, prop, receiver) {
				// 1. Если свойство или метод существует прямо в TCollectionStorageDriver (execute, batch, events, _storage) — возвращаем его
				if (prop in target) {
					return Reflect.get(target, prop, receiver)
				}

				// 2. Блокировка мутирующих методов массива
				if (typeof prop === 'string' && MUTATING_ARRAY_METHODS.has(prop)) {
					throw new Error(
						`[TCollectionStorageDriver] Array mutation method "${prop}()" is forbidden on driver. ` +
							`Use commands via driver.execute() or extension methods (e.g. extension.insert()) instead.`,
					)
				}

				// 3. Чтение по числовому индексу (driver[0], driver[1]...)
				if (typeof prop === 'string' && /^\d+$/.test(prop)) {
					return target._storage.items[Number(prop)]
				}

				// 4. Безопасные методы чтения и свойства массива storage.items (length, find, filter, map, includes, Symbol.iterator и т.д.)
				const items = target._storage.items
				const value = Reflect.get(items, prop)

				// Если метод массива (например, items.find, items.filter, items.slice)
				if (typeof value === 'function') {
					return value.bind(items)
				}

				return value
			},
		}) as unknown as TCollectionStorageDriver<T>
	}

	/**
	 * Снимок состава коллекции для UI.
	 *
	 * `accessor.getValue()` вызывает `valueOf()` — та же конвенция, что у TClasses.
	 * Без явной реализации Proxy отдаёт `Object.prototype.valueOf`, возвращающий
	 * сам драйвер: идентичность не меняется, и фреймворк не видит изменения состава.
	 * Драйвер при этом остаётся драйвером — методы чтения никуда не деваются.
	 */
	public valueOf(): T[] {
		return [...this._storage.items]
	}

	/**
	 * Результат цепочки проекторов.
	 *
	 * Ленивый и кэшируемый: пересчёт происходит только на первое чтение после
	 * инвалидации, а до тех пор отдаётся та же ссылка на массив — без этого
	 * аксессор считал бы каждое чтение изменением состава.
	 *
	 * Пустой реестр не меняет поведение по смыслу: `_computeProjection` просто
	 * отдаёт снимок сырого состава — то же, что `valueOf()`.
	 */
	public get projection(): readonly T[] {
		if (this._projectionCache === null) {
			this._projectionCache = this._computeProjection()
		}

		return this._projectionCache
	}

	/**
	 * Проецированный элемент → исходный из storage.
	 *
	 * Без подмены ссылки (фильтр, сортировка) карта пуста, и метод — тождество.
	 * С Proxy-обёрткой разрешает до объекта из storage транзитивно: см.
	 * `_computeProjection`, где источник каждой связки сам уже разрешён через
	 * строящуюся карту.
	 */
	public canonical(item: T): T {
		if (item === null || typeof item !== 'object') return item

		return this._canonicalMap.get(item as object) ?? item
	}

	/** Пересчитать проекцию по текущей цепочке проекторов и перестроить карту канонизации. */
	private _computeProjection(): readonly T[] {
		const canonicalMap = new WeakMap<object, T>()

		if (this._projectors.length === 0) {
			this._canonicalMap = canonicalMap

			// Снимок, а не живая ссылка на storage.items: тот же контракт, что у
			// valueOf() (см. «Контракт границы core → ui» в AGENTS.md). Между
			// инвалидациями ссылку держит кэш `projection`; без копии здесь
			// пересчёт после мутации storage (splice on place) отдавал бы ту же
			// ссылку, и граница не увидела бы изменения по идентичности.
			return [...this._storage.items]
		}

		const ctx: IProjectionContext<T> = {
			link: (projected: T, source: T) => {
				if (projected === null || typeof projected !== 'object') return

				const resolvedSource =
					source !== null && typeof source === 'object'
						? (canonicalMap.get(source as object) ?? source)
						: source

				canonicalMap.set(projected as object, resolvedSource)
			},
		}

		let result: readonly T[] = this._storage.items

		for (const projector of this._projectors) {
			result = projector(result, ctx)
		}

		this._canonicalMap = canonicalMap

		return result
	}

	/** Пометить проекцию устаревшей и сообщить об этом — без пересчёта здесь же. */
	private _invalidateProjection(): void {
		this._projectionCache = null

		this.events.emit('change:projection')
	}

	/**
	 * Выполняет команду над коллекцией. Если в данный момент выполняется батч, то события не эмитятся сразу, а откладываются до конца батча.
	 * @param command Команда для выполнения
	 */
	public execute(command: ICommand<T>): void {
		// apply отвечает за мутацию и синхронные «before»-хуки (например, item factory).
		// Выполняется всегда сразу, в том числе внутри батча.
		const ctx: ICommandContext<T> = { storage: this._storage, events: this.events }

		command.apply(ctx)

		if (!this._isBatching) {
			command.emitEvents(ctx)
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

				commandsToEmit.forEach((cmd) =>
					cmd.emitEvents({ storage: this._storage, events: this.events }),
				)

				this.events.emit('change:items', this._storage.items)
			}
		}
	}
}
