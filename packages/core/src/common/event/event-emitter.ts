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

/** Обработчики события: единственный — как есть, со второго — набор. */
type THandlers = TEventHandler | Set<TEventHandler>

/**
 * Эмит единственного обработчика, который идёт сейчас: чей, какого события и
 * кого зовёт, и набор, в который этот обработчик вырос за свой вызов.
 * `handler` снят — обработчик отписался, и набора, который эмит обходит,
 * больше нет.
 */
interface IFrame {
	emitter?: object
	event?: string
	handler?: TEventHandler
	grown?: Set<TEventHandler>
}

/**
 * Идущие эмиты единственного обработчика — стеком: обработчик вправе
 * эмитить сам. Записи переиспользуются по глубине, а после эмита
 * очищаются — стек не держит ни эмиттеров, ни обработчиков.
 */
const frames: IFrame[] = []
let depth = 0

/**
 * A generic emitter, where Events is a map of events and their signatures.
 *
 * It pays for a subscription, not for an event, and for the second one not
 * before it happens. The only listened event lives in the emitter's fields,
 * and the event map appears with the second one and goes with the last
 * unsubscription. The only handler of an event lives as is, and the handler
 * set appears with the second one and goes with the last. Most buses are
 * listened to with one event and one handler: a collection item that has never
 * been drawn is listened to only by its collection (`change:contentFit` of a
 * ListBox item, `change:disabled` of a table row, `change:text` of a selected
 * Select option). The attribute sets `aria`, `classes` and `dataset` used to be
 * such buses too, before they lost theirs (`TAttributes`), and a map with a set
 * for each was almost half of the subscriptions of a table row.
 *
 * The emit semantics are those of iterating a set (`Set.forEach`): handlers run
 * in subscription order, one removed during an emit is not called in it, one
 * added is called in the same emit. Without a set the emit calls the handler
 * directly, and if that one added another during its call, it iterates the
 * set it has grown into — just as it would have iterated a set from the start
 * (`frames`).
 *
 * @example
 * const emitter = new TEventEmitter<{ greet: (msg: string) => void }>()
 * emitter.emit('greet', 123) // Error
 */
export class TEventEmitter<
	Events extends Record<string, (...args: any[]) => any> = Record<
		string,
		(...args: any[]) => any
	>,
> implements IEventEmitter {
	/** Единственное слушаемое событие — пока второго нет. */
	private _event?: string
	/** Обработчики единственного события. */
	private _handlers?: THandlers
	/** Обработчики по событиям — со второго события, пока есть хоть одна подписка. */
	private _items?: Map<string, THandlers>

	private _size = 0

	/** Число подписок — пар «событие × обработчик». */
	get size(): number {
		return this._size
	}

	on<K extends keyof Events>(event: K, handler: Events[K]): void {
		const name = event as string
		const added = handler as TEventHandler
		const current = this._get(name)

		if (current === undefined) {
			this._set(name, added)
		} else if (typeof current === 'function') {
			if (current === added) return

			const grown = new Set([current, added])

			this._set(name, grown)
			this._eachFrame(name, current, (frame) => (frame.grown = grown))
		} else {
			if (current.has(added)) return

			current.add(added)
		}

		this._size++
	}

	/**
	 * Снять обработчик. Последний ушёл — уходит и запись события, а с последней
	 * подпиской — и карта: эмиттер живёт дольше подписчиков (строка таблицы —
	 * дольше своих монтирований), и пустые наборы копились бы по одному на
	 * каждое событие, которое когда-нибудь слушали.
	 */
	off<K extends keyof Events>(event: K, handler: Events[K]): void {
		const name = event as string
		const current = this._get(name)

		if (current === undefined) return

		if (typeof current === 'function') {
			if (current !== handler) return

			this._drop(name, current)
		} else {
			if (!current.delete(handler as TEventHandler)) return
			if (current.size === 0) this._delete(name)
		}

		this._size--

		if (this._size === 0) this._items = undefined
	}

	emit<K extends keyof Events>(event: K, ...args: Parameters<Events[K]>): void {
		const name = event as string
		const handlers = this._get(name)

		if (handlers === undefined) return

		if (typeof handlers !== 'function') {
			handlers.forEach((handler) => handler(...args))

			return
		}

		const frame = open(this, name, handlers)
		let grown: Set<TEventHandler> | undefined

		try {
			handlers(...args)
		} finally {
			grown = close(frame)
		}

		if (grown === undefined) return

		// Обход набора, в который вырос обработчик, — дальше него самого: он
		// первый, пока не отписался
		let first = true

		grown.forEach((handler) => {
			const skip = first && handler === handlers

			first = false

			if (!skip) handler(...args)
		})
	}

	remove(event?: string): void {
		if (event) {
			const handlers = this._get(event)

			if (handlers === undefined) return

			if (typeof handlers === 'function') {
				this._drop(event, handlers)
				this._size--
			} else {
				this._delete(event)
				this._size -= handlers.size
			}

			if (this._size === 0) this._items = undefined
		} else {
			const single = this._event

			if (single !== undefined && typeof this._handlers === 'function') {
				this._eachFrame(single, this._handlers, unhook)
			}

			this._items?.forEach((handlers, name) => {
				if (typeof handlers === 'function') this._eachFrame(name, handlers, unhook)
			})

			this._event = this._handlers = this._items = undefined
			this._size = 0
		}
	}

	private _get(name: string): THandlers | undefined {
		if (this._items) return this._items.get(name)

		return this._event === name ? this._handlers : undefined
	}

	/** Положить обработчики события: второе событие переводит эмиттер на карту. */
	private _set(name: string, handlers: THandlers): void {
		const single = this._event
		const singleHandlers = this._handlers

		if (this._items) {
			this._items.set(name, handlers)
		} else if (single === undefined || single === name || singleHandlers === undefined) {
			this._event = name
			this._handlers = handlers
		} else {
			this._items = new Map([
				[single, singleHandlers],
				[name, handlers],
			])
			this._event = this._handlers = undefined
		}
	}

	private _delete(name: string): void {
		if (this._items) this._items.delete(name)
		else if (this._event === name) this._event = this._handlers = undefined
	}

	/** Снять запись единственного обработчика: эмит, который его зовёт, обходить больше нечего. */
	private _drop(name: string, handler: TEventHandler): void {
		this._delete(name)
		this._eachFrame(name, handler, unhook)
	}

	/** Идущие эмиты этого эмиттера, которые зовут единственный обработчик события. */
	private _eachFrame(name: string, handler: TEventHandler, apply: (frame: IFrame) => void): void {
		for (let index = 0; index < depth; index++) {
			const frame = frames[index]

			if (
				frame.emitter === this &&
				frame.event === name &&
				frame.handler === handler &&
				frame.grown === undefined
			) {
				apply(frame)
			}
		}
	}
}

/** Эмит единственного обработчика начался: запись стека на его глубине. */
function open(emitter: object, event: string, handler: TEventHandler): IFrame {
	const frame = (frames[depth] ??= {})

	frame.emitter = emitter
	frame.event = event
	frame.handler = handler
	frame.grown = undefined
	depth++

	return frame
}

/** Эмит единственного обработчика закончился: набор, в который тот вырос, — а запись очищена. */
function close(frame: IFrame): Set<TEventHandler> | undefined {
	const grown = frame.grown

	depth--
	frame.emitter = frame.event = frame.handler = frame.grown = undefined

	return grown
}

/** Обработчик эмита отписался: набора, который эмит обходит, больше нет. */
function unhook(frame: IFrame): void {
	frame.handler = undefined
}
