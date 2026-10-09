// Тип обработчика события
export type TEventHandler = (...args: unknown[]) => unknown

// Базовый интерфейс для совместимости
export interface IEventSource {
	on(event: string, handler: TEventHandler): void
	off(event: string, handler: TEventHandler): void
}

export interface IEventEmitter extends IEventSource {
	emit(event: string, ...args: unknown[]): void
	remove(event?: string): void
}

/** Источник событий: объект с `on`/`off` — эмиттер, `TEvented` или совместимый. */
export function isEventSource(value: unknown): value is IEventSource {
	return (
		typeof value === 'object' &&
		value !== null &&
		'on' in value &&
		typeof value.on === 'function' &&
		'off' in value &&
		typeof value.off === 'function'
	)
}

/**
 * Обобщённый эмиттер, где Events — словарь событий и их сигнатур.
 * @example
 * const emitter = new TEventEmitter<{ greet: (msg: string) => void }>()
 * emitter.emit('greet', 123) // Ошибка
 */
export class TEventEmitter<
	Events extends Record<string, (...args: any[]) => any> = Record<
		string,
		(...args: any[]) => any
	>,
> implements IEventEmitter {
	private _items: Map<string, Set<TEventHandler>> = new Map()

	private _size = 0

	/** Число подписок — пар «событие × обработчик». */
	get size(): number {
		return this._size
	}

	on<K extends keyof Events>(event: K, handler: Events[K]): void {
		let handlers = this._items.get(event as string)
		if (!handlers) {
			handlers = new Set()
			this._items.set(event as string, handlers)
		}
		if (handlers.has(handler as TEventHandler)) return
		handlers.add(handler as TEventHandler)
		this._size++
	}

	/**
	 * Снять обработчик. Последний ушёл — уходит и набор события: эмиттер
	 * живёт дольше подписчиков (строка таблицы — дольше своих монтирований), и
	 * пустые наборы копились бы по одному на каждое событие, которое
	 * когда-нибудь слушали.
	 */
	off<K extends keyof Events>(event: K, handler: Events[K]): void {
		const handlers = this._items.get(event as string)

		if (!handlers?.delete(handler as TEventHandler)) return

		this._size--

		if (handlers.size === 0) this._items.delete(event as string)
	}

	emit<K extends keyof Events>(event: K, ...args: Parameters<Events[K]>): void {
		this._items.get(event as string)?.forEach((handler) => handler(...args))
	}

	remove(event?: string): void {
		if (event) {
			this._size -= this._items.get(event)?.size ?? 0
			this._items.delete(event)
		} else {
			this._items.clear()
			this._size = 0
		}
	}
}
