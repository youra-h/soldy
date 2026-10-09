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
 *
 * Платит за подписку, а не за событие: карта наборов заводится с первой
 * подпиской и уходит с последней отпиской, а набор события — с его первым и
 * последним обработчиком.
 *
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
	/** Наборы обработчиков по событиям — пока есть хоть одна подписка. */
	private _items?: Map<string, Set<TEventHandler>>

	private _size = 0

	/** Число подписок — пар «событие × обработчик». */
	get size(): number {
		return this._size
	}

	on<K extends keyof Events>(event: K, handler: Events[K]): void {
		const items = (this._items ??= new Map())
		let handlers = items.get(event as string)
		if (!handlers) {
			handlers = new Set()
			items.set(event as string, handlers)
		}
		if (handlers.has(handler as TEventHandler)) return
		handlers.add(handler as TEventHandler)
		this._size++
	}

	/**
	 * Снять обработчик. Последний ушёл — уходит и набор события, а с последней
	 * подпиской — и карта: эмиттер живёт дольше подписчиков (строка таблицы —
	 * дольше своих монтирований), и пустые наборы копились бы по одному на
	 * каждое событие, которое когда-нибудь слушали.
	 */
	off<K extends keyof Events>(event: K, handler: Events[K]): void {
		const items = this._items
		const handlers = items?.get(event as string)

		if (!items || !handlers?.delete(handler as TEventHandler)) return

		this._size--

		if (handlers.size === 0) items.delete(event as string)
		if (this._size === 0) this._items = undefined
	}

	emit<K extends keyof Events>(event: K, ...args: Parameters<Events[K]>): void {
		this._items?.get(event as string)?.forEach((handler) => handler(...args))
	}

	remove(event?: string): void {
		if (event) {
			const handlers = this._items?.get(event)

			if (!handlers) return

			this._size -= handlers.size
			this._items?.delete(event)

			if (this._size === 0) this._items = undefined
		} else {
			this._items = undefined
			this._size = 0
		}
	}
}
