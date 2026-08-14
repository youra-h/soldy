import { TEventEmitter } from './event-emitter'
import type { TEventContext, TEventMiddleware } from './middleware'

/**
 * Описание правила проброса одного события из источника.
 *
 * @template TSource - события источника
 * @template TTarget - события цели (текущего эмиттера)
 */
export type TRelayRule<
	TSource extends Record<string, (...args: any) => any>,
	TTarget extends Record<string, (...args: any) => any>,
> = {
	/** Имя события в источнике */
	from: keyof TSource
	/**
	 * Имя события в цели. Если не указано — используется то же имя, что и `from`.
	 * Используется для переименования событий при проброске.
	 *
	 * @example
	 * // Пробросить item:added как tab:added
	 * { from: 'item:added', as: 'tab:added' }
	 */
	as?: keyof TTarget
	/**
	 * Хук, вызываемый **до** проброса события в цель.
	 * Удобен для подписки на события нового элемента сразу в момент его добавления —
	 * до того, как внешний код узнает о событии.
	 *
	 * @example
	 * {
	 *   from: 'item:added',
	 *   then: ({ item }) => {
	 *     item.events.on('change:disabled', (value) => {
	 *       this.events.emit('item:disabled', item, value)
	 *     })
	 *   }
	 * }
	 */
	then?: (...args: any[]) => void
}

export class TEvented<TEvents extends Record<string, (...args: any) => any>> {
	private _items: TEventEmitter<TEvents> = new TEventEmitter()

	/**
	 * Список зарегистрированных сквозных перехватчиков (middleware).
	 */
	private _middlewares: TEventMiddleware<TEvents>[] = []

	/**
	 * Список исходящих подписок, созданных через {@link relay}.
	 * Нужен для того, чтобы {@link dispose} мог отписаться от всех источников.
	 */
	private _relays: {
		source: TEvented<any>
		event: any
		handler: (...args: any[]) => void
	}[] = []

	/**
	 * Счётчик глушения событий.
	 * Значение > 0 означает, что генерация событий временно приостановлена.
	 */
	private _muteDepth = 0

	/**
	 * Флаг, указывающий, заглушен ли эмиттер в данный момент.
	 */
	get isMuted(): boolean {
		return this._muteDepth > 0
	}

	/**
	 * Регистрирует сквозной перехватчик для ВСЕХ событий.
	 * Удобно для логирования, трейсинга, аналитики и проброса событий.
	 *
	 * @param middleware - Функция, вызываемая при каждом срабатывании событий.
	 * @returns Функция отписки от перехватчика.
	 *
	 * @example
	 * const unuse = events.use(({ event, args, type }) => {
	 *     console.log(`[${type}] ${String(event)}`, args)
	 * })
	 *
	 * @example
	 * // Сквозной проброс всех событий из источника:
	 * source.events.use(({ event, args }) => {
	 *     this.events.emit(event, ...args)
	 * })
	 */
	use(middleware: TEventMiddleware<TEvents>): () => void {
		this._middlewares.push(middleware)

		return () => {
			const index = this._middlewares.indexOf(middleware)

			if (index !== -1) {
				this._middlewares.splice(index, 1)
			}
		}
	}

	/**
	 * Внутренний метод для оповещения всех перехватчиков.
	 * Выполняется за O(N) без рекурсии и лишних замыканий.
	 */
	private _notifyMiddlewares(
		type: TEventContext['type'],
		event: keyof TEvents,
		args: any[],
	): void {
		if (this._middlewares.length === 0) return

		const ctx: TEventContext<TEvents> = {
			event,
			args: args as Parameters<TEvents[keyof TEvents]>,
			type,
			timestamp: Date.now(),
		}

		for (let i = 0; i < this._middlewares.length; i++) {
			try {
				this._middlewares[i](ctx)
			} catch (error) {
				console.error(`Error in TEvented middleware for event "${String(event)}":`, error)
			}
		}
	}

	/**
	 * Приостанавливает отправку всех событий (увеличивает глубину блокировки).
	 *
	 * Парный вызов {@link resume} восстанавливает отправку.
	 * Поддерживает вложенность: блокировка снимется только после того,
	 * как `resume()` будет вызван столько же раз, сколько и `pause()`.
	 */
	pause(): void {
		this._muteDepth++
	}

	/**
	 * Возобновляет отправку событий (уменьшает глубину блокировки).
	 *
	 * Если счётчик достигает нуля — события снова начнут доставляться.
	 */
	resume(): void {
		if (this._muteDepth > 0) {
			this._muteDepth--
		}
	}

	/**
	 * Выполняет функцию `fn` в «тихом» режиме.
	 * Любые вызовы `emit` внутри `fn` будут проигнорированы.
	 *
	 * Благодаря счётчику `_muteDepth`, даже если внутри `silent`
	 * вызовы будут вложенными, блокировка снимется только тогда,
	 * когда завершится самый верхний блок `silent`.
	 *
	 * @param fn - Функция, внутри которой события должны быть отключены.
	 * @returns Результат выполнения функции `fn`.
	 *
	 * @example
	 * // Эмитит 'item:text'
	 * tab.text = 'Новое имя'
	 *
	 * // НЕ эмитит ничего наверх, так как вызвано внутри silent
	 * tabs.events.silent(() => {
	 *     tab.text = 'Скрытое имя'
	 * })
	 */
	silent<T>(fn: () => T): T {
		this.pause()

		try {
			return fn()
		} finally {
			this.resume()
		}
	}

	/**
	 * Подписка на событие
	 * @param event - имя события
	 * @param handler - обработчик события
	 */
	on<K extends keyof TEvents>(event: K, handler: TEvents[K]): void {
		this._items.on(event, handler)
	}

	/**
	 * Отписка от события
	 * @param event - имя события
	 * @param handler - обработчик события
	 */
	off<K extends keyof TEvents>(event: K, handler: TEvents[K]): void {
		this._items.off(event, handler)
	}

	/**
	 * Вызов события.
	 * Если эмиттер заглушен (см. {@link isMuted}, {@link silent}) — вызов игнорируется.
	 *
	 * @param event - имя события
	 * @param args - аргументы события
	 */
	emit<K extends keyof TEvents>(event: K, ...args: Parameters<TEvents[K]>): void {
		if (this.isMuted) return
		this._notifyMiddlewares('emit', event, args)
		this._items.emit(event, ...args)
	}

	/**
	 * Выполняет событие и возвращает первый не-undefined результат (short-circuit).
	 * При глушении возвращает `undefined`.
	 */
	emitResolve<T, K extends keyof TEvents>(
		event: K,
		...args: Parameters<TEvents[K]>
	): T | undefined {
		if (this.isMuted) return undefined
		this._notifyMiddlewares('emitResolve', event, args)
		return this._items.emitResolve<T, K>(event, ...args)
	}

	/**
	 * Выполняет событие и возвращает все не-undefined результаты обработчиков.
	 * При глушении возвращает пустой массив `[]`.
	 */
	emitResolveAll<T, K extends keyof TEvents>(event: K, ...args: Parameters<TEvents[K]>): T[] {
		if (this.isMuted) return []
		this._notifyMiddlewares('emitResolveAll', event, args)
		return this._items.emitResolveAll<T, K>(event, ...args)
	}

	/**
	 * Декларативный маппинг событий из источника (`source`) в текущий эмиттер.
	 *
	 * Каждый элемент массива `rules` — либо строка (имя события, пробрасывается как есть),
	 * либо объект `TRelayRule` с расширенными возможностями:
	 * - `as` — переименовать событие при проброске
	 * - `then` — хук, вызываемый **до** проброса (удобно для подписки на дочерние события)
	 *
	 * @param source - источник событий (другой `TEvented`)
	 * @param rules  - список правил проброса
	 *
	 * @example
	 * // Простой проброс нескольких событий без изменений:
	 * this.events.relay(this._collection.events, [
	 *   'item:beforeDelete',
	 *   'item:deleted',
	 *   'cleared',
	 * ])
	 *
	 * @example
	 * // Переименование события:
	 * this.events.relay(this._collection.events, [
	 *   { from: 'item:added', as: 'tab:added' },
	 * ])
	 *
	 * @example
	 * // Хук then — подписаться на события нового элемента до его появления снаружи:
	 * this.events.relay(this._collection.events, [
	 *   {
	 *     from: 'item:added',
	 *     then: ({ item }) => {
	 *       item.events.on('change:disabled', (value) => {
	 *         this.events.emit('item:disabled', item, value)
	 *       })
	 *     },
	 *   },
	 * ])
	 *
	 * @example
	 * // Комбинация: переименование + хук:
	 * this.events.relay(this._collection.events, [
	 *   {
	 *     from: 'item:added',
	 *     as: 'tab:added',
	 *     then: ({ item }) => {
	 *       item.size = this.size
	 *     },
	 *   },
	 *   'item:deleted',
	 * ])
	 */
	relay<TSource extends Record<string, (...args: any) => any>>(
		source: TEvented<TSource>,
		rules: (keyof TSource | TRelayRule<TSource, TEvents>)[],
	): void {
		// Внутри relay используем неограниченные типы — безопасность обеспечивается
		// на уровне TRelayRule и сигнатуры метода, а не внутри реализации.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const src = source as TEvented<any>
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const tgt = this as TEvented<any>

		for (const rule of rules) {
			if (typeof rule === 'string' || typeof rule === 'symbol') {
				const event = rule as any
				const handler = (...args: any[]) => tgt.emit(event, ...args)

				src.on(event, handler)
				this._relays.push({ source: src, event, handler })
			} else {
				const { from, as: targetEvent, then: hook } = rule as TRelayRule<TSource, TEvents>

				const target = targetEvent ?? from

				const handler = (...args: any[]) => {
					hook?.(...args)
					tgt.emit(target as any, ...args)
				}

				src.on(from as any, handler)
				this._relays.push({ source: src, event: from as any, handler })
			}
		}
	}

	/**
	 * Полностью очищает эмиттер: отписывается от всех проброшенных событий ({@link relay}),
	 * снимает middleware и удаляет входящие подписки.
	 */
	destroy(): void {
		for (const { source, event, handler } of this._relays) {
			source.off(event, handler)
		}

		this._relays = []
		this._middlewares = []
		this._items.remove()
	}
}
