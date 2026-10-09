import { TEventEmitter } from './event-emitter'
import type { IEventEmitter } from './event-emitter'
import type { TEventContext, TEventMiddleware } from './middleware'
import { TRelays } from './relays'
import type { TEventListener, TEventSink, TRelayRule, TRelayedEvents } from './types'

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

/**
 * TEvented — шина событий: подписки {@link on}, перехватчики {@link use},
 * слушатели всех событий {@link listen} и пробросы из источников
 * ({@link relay}, {@link relayAll}).
 *
 * **Шина платит за подписку, а не за то, что создана.** Эмиттер подписок,
 * список перехватчиков, список слушателей и пробросы заводятся при первом
 * использовании, а последняя отписка снимает то, что завела первая: шина без
 * подписчиков — один объект. Шин много — у каждого экземпляра ядра, плагина и
 * расширения, — а слушают большинство из них, только пока компонент
 * смонтирован. Раньше всё это заводил конструктор, и строка таблицы с
 * чекбоксом держала по 34 шины с эмиттером, картой и пробросами у каждой.
 *
 * **Кто когда узнаёт о событии.** Перехватчики — первыми, затем обработчики
 * этого события, затем слушатели всех событий. Заглушённый эмит
 * ({@link silent}, {@link pause}) не доходит ни до кого.
 */
export class TEvented<TEvents extends Record<string, (...args: any) => any>> {
	/** Подписки {@link on} — с первой, до последней отписки. */
	private _items?: TEventEmitter<TEvents>

	/** Сквозные перехватчики {@link use} — с первым, до последнего. */
	private _middlewares?: TEventMiddleware<TEvents>[]

	/**
	 * Слушатели всех событий {@link listen} — с первым, до последнего. Список не
	 * правится на месте, а заменяется новым: эмит обходит тот, что застал.
	 */
	private _listeners?: readonly TEventListener<TEvents>[]

	/** Пробросы {@link relay} и {@link relayAll} — с первым: подписаны на источники, пока эмиттер слушают. */
	private _relays?: TRelays

	/** Слушают ли эмиттер: есть подписчики, перехватчики или слушатели. */
	private get _listened(): boolean {
		return (
			this._items !== undefined ||
			this._middlewares !== undefined ||
			this._listeners !== undefined
		)
	}

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
		// Первый — литералом: у массива, собранного по элементу, запас под рост
		if (this._middlewares) this._middlewares.push(middleware)
		else this._middlewares = [middleware]

		this._relays?.subscribe()

		return () => {
			const middlewares = this._middlewares
			const index = middlewares?.indexOf(middleware) ?? -1

			if (middlewares === undefined || index === -1) return

			middlewares.splice(index, 1)

			if (middlewares.length === 0) this._middlewares = undefined
			if (!this._listened) this._relays?.unsubscribe()
		}
	}

	/**
	 * Внутренний метод для оповещения всех перехватчиков.
	 * Выполняется за O(N) без рекурсии и лишних замыканий.
	 *
	 * Обход живой: перехватчик, снятый посреди эмита, дальше не вызывается.
	 */
	private _notifyMiddlewares<K extends keyof TEvents>(
		type: TEventContext['type'],
		event: K,
		args: Parameters<TEvents[K]>,
	): void {
		if (this._middlewares === undefined) return

		const ctx: TEventContext<TEvents, K> = {
			event,
			args,
			type,
			timestamp: Date.now(),
		}

		for (let i = 0; ; i++) {
			const middleware = this._middlewares?.[i]

			if (middleware === undefined) break

			try {
				middleware(ctx)
			} catch (error) {
				console.error(`Error in TEvented middleware for event "${String(event)}":`, error)
			}
		}
	}

	/**
	 * Внутренний метод для оповещения слушателей всех событий — после
	 * обработчиков `on`. Обходит список, который застал: поставленный посреди
	 * эмита получит следующий, а снятый посреди эмита этот уже не получает.
	 */
	private _notifyListeners<K extends keyof TEvents>(
		event: K,
		args: Parameters<TEvents[K]>,
	): void {
		const listeners = this._listeners

		if (listeners === undefined) return

		for (const listener of listeners) {
			if (this._listeners !== listeners && !this._listeners?.includes(listener)) continue

			listener(event, args)
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
		this._items ??= new TEventEmitter()
		this._items.on(event, handler)
		this._relays?.subscribe()
	}

	/**
	 * Отписка от события
	 * @param event - имя события
	 * @param handler - обработчик события
	 */
	off<K extends keyof TEvents>(event: K, handler: TEvents[K]): void {
		const items = this._items

		if (items === undefined) return

		items.off(event, handler)

		if (items.size === 0) this._items = undefined
		if (!this._listened) this._relays?.unsubscribe()
	}

	/**
	 * Слушать все события шины: имя и аргументы каждого эмита.
	 *
	 * Слушатель узнаёт о событии **после** обработчиков `on` этого события —
	 * и тех, что подписались позже него, — в порядке подписки слушателей.
	 * Заглушённый эмит его не вызывает. Для пробросов он такой же подписчик, как
	 * `on` и `use`: первый подписчик цели подключает её к источникам.
	 *
	 * Чем отличается от {@link use}: перехватчик срабатывает **до** обработчиков
	 * и на каждый эмит собирает контекст с меткой времени. Слушателю событие
	 * отдают последним — так обмен адаптера узнаёт о нём после подписчиков ядра,
	 * а одного слушателя на шину ему хватает вместо подписки на каждое событие.
	 *
	 * Слушатель, снятый посреди эмита, этот эмит уже не получает; поставленный
	 * посреди эмита получает следующий.
	 *
	 * @param listener - слушатель: имя события и его аргументы
	 * @returns Функция отписки слушателя.
	 *
	 * @example
	 * const unlisten = events.listen((event, args) => {
	 *     console.log(String(event), args)
	 * })
	 */
	listen(listener: TEventListener<TEvents>): () => void {
		// Литерал, а не спред в пустой список: у массива, собранного по элементу,
		// запас под рост, а слушатель у шины обычно один
		this._listeners = this._listeners ? [...this._listeners, listener] : [listener]
		this._relays?.subscribe()

		return () => {
			const listeners = this._listeners
			const index = listeners?.indexOf(listener) ?? -1

			if (listeners === undefined || index === -1) return

			this._listeners =
				listeners.length === 1
					? undefined
					: [...listeners.slice(0, index), ...listeners.slice(index + 1)]

			if (!this._listened) this._relays?.unsubscribe()
		}
	}

	/**
	 * Вызов события.
	 * Если эмиттер заглушен (см. {@link isMuted}, {@link silent}) — вызов игнорируется.
	 *
	 * Порядок — перехватчики {@link use}, обработчики события {@link on},
	 * слушатели всех событий {@link listen}.
	 *
	 * @param event - имя события
	 * @param args - аргументы события
	 */
	emit<K extends keyof TEvents>(event: K, ...args: Parameters<TEvents[K]>): void {
		if (this.isMuted) return
		this._notifyMiddlewares('emit', event, args)
		this._items?.emit(event, ...args)
		this._notifyListeners(event, args)
	}

	/**
	 * Декларативный маппинг событий из источника (`source`) в текущий эмиттер.
	 *
	 * Каждый элемент массива `rules` — либо строка (имя события, пробрасывается как есть),
	 * либо объект `TRelayRule` с расширенными возможностями:
	 * - `as` — переименовать событие при проброске
	 * - `then` — хук, вызываемый **до** проброса (удобно для подписки на дочерние события)
	 *
	 * Подписан на источник проброс, только пока этот эмиттер слушают (см.
	 * `TRelays`), поэтому и хук `then` срабатывает только тогда. Действие,
	 * которое нужно на каждое событие источника, — подписка на сам источник.
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
	 *       item.aria.add('tabindex', '-1')
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

			this._relay(() => {
				src.on(from, handler)

				return () => src.off(from, handler)
			})
		}
	}

	/**
	 * Пробросить в цель **все** события источника под теми же именами.
	 *
	 * Отличие от {@link relay} не в объёме проброса, а в том, где записан его
	 * состав. `relay` требует список имён — и тогда карта цели объявляется
	 * вторым, независимым списком: одно знание лежит в двух местах, новое
	 * событие источника приходится дописывать в оба, а забытая правка тихо
	 * оставляет событие непроброшенным. У `relayAll` списка нет: состав
	 * проброса — это и есть карта источника, поэтому у цели она ставится
	 * целиком (`TEvents = … & TSource`), и новое событие источника доезжает до
	 * цели само.
	 *
	 * Берите его там, где цель по смыслу **представляет** источник наружу:
	 * фасад коллекции над своим расширением, фасад элемента над item-адаптером.
	 * Там, где проброс сознательно уже карты источника или событие
	 * переименовано, нужен {@link relay} — там список имён несёт смысл, а не
	 * дублирует его.
	 *
	 * **Что сверяет сигнатура.** Цель обязана быть `TEventSink<TSource>`:
	 * каждое событие источника есть в карте цели, и обработчик цели принимает
	 * аргументы источника. Пропущенное имя — ошибка на строке вызова. Обратную
	 * сторону, в отличие от `relay`, проверка не принимает: карта цели не
	 * может оказаться уже карты источника.
	 *
	 * **Пересечения.** Два `relayAll` с общим именем события дают цели два
	 * эмита на один факт. Сигнатура этого не ловит — оба источника объявляют
	 * имя законно. Пересечение имён значит, что событие ходит до цели двумя
	 * путями, и лечится это у источника, а не здесь.
	 *
	 * **Как устроено.** Перечислить имена карты в рантайме нельзя — карта живёт
	 * только в типах. Поэтому проброс висит на {@link use}: перехватчик
	 * срабатывает на каждом `emit` источника, включая события, которые тот сам
	 * получил релеем. Перехватчик стоит, пока цель слушают, как и подписки
	 * `relay` (см. `TRelays`): подписками `on`, перехватчиками `use` или
	 * слушателями {@link listen}.
	 *
	 * Порядок при этом иной, чем у `relay`: перехватчик работает **до**
	 * обработчиков `on` источника, то есть подписчик цели узнаёт о событии
	 * раньше подписчиков самого источника — и слушатель цели тоже: правило
	 * «слушатель — после обработчиков» действует в пределах одной шины. Для
	 * проброса это безразлично — важно, что цель получает событие в том же
	 * такте.
	 *
	 * @param source - источник событий (другой `TEvented`)
	 *
	 * @example
	 * // Фасад коллекции отдаёт наружу весь набор своего расширения:
	 * this.events.relayAll(this.extensions.batch.events)
	 */
	relayAll<TSource extends Record<string, (...args: any) => any>>(
		this: TEvented<TEvents> & NoInfer<TEventSink<TSource>>,
		source: TEvented<TSource>,
	): void {
		// Сверку сделала сигнатура (this-параметр). Тело эмитит в цель как в
		// канал без карты событий — см. TRelayChannel.
		const tgt = this._channel

		this._relay(() =>
			source.use(({ event, args }) => {
				tgt.emit(String(event), ...args)
			}),
		)
	}

	/**
	 * Полностью очищает эмиттер: отписывается от всех проброшенных событий ({@link relay}),
	 * снимает middleware, слушателей и входящие подписки.
	 */
	destroy(): void {
		this._relays?.destroy()
		this._relays = undefined
		this._middlewares = undefined
		this._listeners = undefined
		this._items = undefined
	}

	/** Завести проброс: пробросы заводятся с первым, а эмиттер, который уже слушают, подписывает его сразу. */
	private _relay(relay: () => () => void): void {
		this._relays ??= new TRelays()
		this._relays.add(relay)

		if (this._listened) this._relays.subscribe()
	}
}
