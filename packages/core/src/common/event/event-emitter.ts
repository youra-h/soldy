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

	on<K extends keyof Events>(event: K, handler: Events[K]): void {
		let handlers = this._items.get(event as string)
		if (!handlers) {
			handlers = new Set()
			this._items.set(event as string, handlers)
		}
		handlers.add(handler as TEventHandler)
	}

	off<K extends keyof Events>(event: K, handler: Events[K]): void {
		this._items.get(event as string)?.delete(handler as TEventHandler)
	}

	emit<K extends keyof Events>(event: K, ...args: Parameters<Events[K]>): void {
		this._items.get(event as string)?.forEach((handler) => handler(...args))
	}

	remove(event?: string): void {
		if (event) {
			this._items.delete(event)
		} else {
			this._items.clear()
		}
	}
}
