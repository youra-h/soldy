import { TEventEmitter } from './event-emitter'
import type { IEventEmitter } from './event-emitter'
import type { TEventContext, TEventMiddleware } from './middleware'
import type { TEventSink, TRelayRule, TRelayedEvents } from './types'

/**
 * Вид эмиттера, через который работает тело {@link TEvented.relay}.
 *
 * Правила и обработчики сверяет сигнатура `relay`: имена — тип правила
 * `TRelayRule`, обработчики — `this`-параметр (см. JSDoc метода). Тело этой
 * сверкой воспользоваться не может: на дженерик-картах `on` ждёт обработчик
 * ровно `TSource[K]`, `emit` — аргументы ровно `Parameters<TEvents[K]>`, и
 * построить такие значения внутри дженерик-метода нельзя. Поэтому тело
 * соединяет эмиттеры по их нетипизированному контракту — тому же
 * `IEventEmitter`, который объявляет `TEventEmitter`.
 *
 * `TEvented<T>` присваивается в этот вид структурно, без приведения, как
 * `TEventEmitter<T>` удовлетворяет `implements IEventEmitter`. Проброс идёт
 * через настоящие `on`/`off`/`emit`, поэтому глушение и middleware цели
 * работают как при прямом вызове.
 */
type TRelayChannel = Pick<IEventEmitter, 'on' | 'off' | 'emit'>

export class TEvented<TEvents extends Record<string, (...args: any) => any>> {
	private _items: TEventEmitter<TEvents> = new TEventEmitter()

	/**
	 * Список зарегистрированных сквозных перехватчиков (middleware).
	 */
	private _middlewares: TEventMiddleware<TEvents>[] = []

	/**
	 * Отписки от источников, на которые подписался {@link relay}.
	 * Нужны для того, чтобы {@link destroy} мог отписаться от всех источников.
	 */
	private _relays: (() => void)[] = []

	/** Этот же эмиттер без карты событий — для тела {@link relay}, см. `TRelayChannel`. */
	private get _channel(): TRelayChannel {
		return this
	}

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
	private _notifyMiddlewares<K extends keyof TEvents>(
		type: TEventContext['type'],
		event: K,
		args: Parameters<TEvents[K]>,
	): void {
		if (this._middlewares.length === 0) return

		const ctx: TEventContext<TEvents, K> = {
			event,
			args,
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
	 * Декларативный маппинг событий из источника (`source`) в текущий эмиттер.
	 *
	 * Каждый элемент массива `rules` — либо строка (имя события, пробрасывается как есть),
	 * либо объект `TRelayRule` с расширенными возможностями:
	 * - `as` — переименовать событие при проброске
	 * - `then` — хук, вызываемый **до** проброса (удобно для подписки на дочерние события)
	 *
	 * **Что сверяет сигнатура.**
	 * - Имена — тип правила `TRelayRule`: строковое правило есть в обеих картах,
	 *   `from` — в источнике, `as ?? from` — в цели. Ошибка встаёт на строку правила.
	 * - Обработчики — `this`-параметр: цель обязана быть `TEventSink` карты
	 *   проброшенных событий `TRelayedEvents` (имя в цели → обработчик `from`).
	 *   Проброс — это эмит в цель, а `TEvented<TEvents>` при `TEvents extends TOwn`
	 *   присваивается в `TEventSink<TOwn>`. Поэтому дженерик-карта цели сверяется
	 *   по своему констрейнту.
	 * - Обработчик цели должен принимать аргументы события источника; параметров у
	 *   цели может быть меньше (`change:selection` → `change:selected: () => void`).
	 *   Обработчики, несовместимые в обе стороны, — ошибка.
	 * - Карта с индексной сигнатурой (у источника или у цели) принимает любое имя и
	 *   обработчики не сверяет.
	 *
	 * **Чего не видит.** TypeScript сравнивает карту цели с картой проброшенных
	 * событий целиком и принимает и обратную сторону — когда вызов пробрасывает одно
	 * событие или правила покрывают карту цели полностью. В таком вызове расширенный
	 * аргумент источника (`boolean | undefined` → `boolean`) и новый обязательный
	 * параметр цели проверка не видит. Вызов с несколькими событиями, не покрывающий
	 * карту цели, обратную сторону не проходит.
	 *
	 * **Почему тело на канале.** Построить аргументы `emit` дженерик-карты внутри
	 * метода нельзя, поэтому тело соединяет эмиттеры без карты событий — см.
	 * `TRelayChannel`. Сверку оно не ослабляет: её уже сделала сигнатура.
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
	relay<
		TSource extends Record<string, (...args: any) => any>,
		const TRules extends readonly TRelayRule<TSource, TEvents>[],
	>(
		this: TEvented<TEvents> & NoInfer<TEventSink<TRelayedEvents<TSource, TRules>>>,
		source: TEvented<TSource>,
		rules: TRules,
	): void {
		// Имена и обработчики сверила сигнатура (TRelayRule и this-параметр). Тело
		// работает с эмиттерами как с каналами без карты событий — см. TRelayChannel.
		const src = source._channel
		const tgt = this._channel

		for (const rule of rules) {
			const {
				from,
				as: target = from,
				then: hook,
			} = typeof rule === 'string' ? { from: rule, as: undefined, then: undefined } : rule

			const handler = (...args: unknown[]): void => {
				hook?.(...args)
				tgt.emit(target, ...args)
			}

			src.on(from, handler)
			this._relays.push(() => src.off(from, handler))
		}
	}

	/**
	 * Полностью очищает эмиттер: отписывается от всех проброшенных событий ({@link relay}),
	 * снимает middleware и удаляет входящие подписки.
	 */
	destroy(): void {
		for (const unsubscribe of this._relays) {
			unsubscribe()
		}

		this._relays = []
		this._middlewares = []
		this._items.remove()
	}
}
