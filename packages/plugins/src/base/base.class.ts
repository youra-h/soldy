import type { IListenable, IPlugin, IPluginContext, TPluginEvents } from './types'
import { TEvented } from '@soldy-ui/core'
import type { TEventSink } from '@soldy-ui/core'

/** Подписка на чужую шину: подписаться и отдать отписку. */
type TSubscription = () => () => void

export abstract class TBasePlugin<
	TInstance = any,
	TEvents extends TPluginEvents = TPluginEvents,
> implements IPlugin<TInstance, TEvents> {
	readonly events: TEvented<TEvents> = new TEvented<TEvents>()

	/**
	 * Подписки {@link _listenTo}, которые ждут принятия набора: до `attach()`
	 * плагин на чужие шины не подписан. Принятие подключает их в порядке
	 * вызовов, `destroy()` забывает.
	 */
	private _deferred: TSubscription[] = []

	/**
	 * Отписки от чужих шин, на которые плагин уже подписан через
	 * {@link _listenTo}. Их снимает `destroy()` — тот же приём, что `_relays`
	 * у `TEvented.relay`.
	 */
	private _unsubscribes: (() => void)[] = []

	/** Плагин принят (`attach()`): `_listenTo` подписывает сразу. */
	private _attached = false

	/** Плагин уничтожен: принятие его подписок не подключает. */
	private _destroyed = false

	install(ctx: IPluginContext, options?: unknown): void {
		this._sink.emit('install', ctx, options)
	}

	/**
	 * Принять плагин: подключить подписки на чужие шины, отложенные
	 * {@link _listenTo}, в порядке вызовов, — и сообщить о принятии.
	 *
	 * Наследник, который выводит значение из чужой шины, переопределяет метод
	 * и после `super.attach()` перечитывает его той же функцией, что
	 * обработчик: смену источника между установкой и принятием подписка не
	 * застала. Обработчик, который отвечает на действие (фокус, прокрутка),
	 * при принятии не зовётся — действия не было.
	 *
	 * Повторный вызов и вызов на уничтоженном плагине ничего не подключают.
	 */
	attach(): void {
		if (this._attached || this._destroyed) return

		this._attached = true

		const deferred = this._deferred

		this._deferred = []

		for (const subscribe of deferred) this._unsubscribes.push(subscribe())

		this._sink.emit('attach')
	}

	/**
	 * Объявляет плагин доступным снаружи и передаёт подписчику сам плагин.
	 *
	 * Вызывает adapter-слой в тот момент, когда фреймворк уже привязал
	 * обработчики событий. В install это делать нельзя: bundle собирается
	 * раньше, и эмит ушёл бы в пустоту.
	 */
	created(): void {
		this._sink.emit('create', this)
	}

	/**
	 * Снимает подписки {@link _listenTo} и забывает отложенные, потом сообщает
	 * об уничтожении. Списки очищаются, поэтому повторный вызов отписываться
	 * уже не будет, а принятие после уничтожения ничего не подключит.
	 */
	destroy(): void {
		this._destroyed = true

		for (const unsubscribe of this._unsubscribes) unsubscribe()

		this._unsubscribes = []
		this._deferred = []
		this._sink.emit('destroy')
	}

	/**
	 * Эмит собственных событий базы — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `@soldy-ui/core`). Эмит звучит за
	 * счёт констрейнта: карта наследника включает `TPluginEvents`.
	 */
	protected get _sink(): TEventSink<TPluginEvents> {
		return this.events
	}

	/**
	 * Подписаться на шину, которая живёт дольше плагина: подписка начинается
	 * с принятия набора (`attach()`), а снимает её `destroy()`.
	 *
	 * Такая шина — у владельца (`ctx.getInstance()`): свой `ctrl` приложения
	 * переживает перемонтирование, и каждое монтирование ставит ему новый набор.
	 * Такие же — у расширений движка коллекции, когда движок пришёл снаружи
	 * (`engine`), и у любого инстанса ядра, которого плагин не создавал (панель
	 * у `TTagsOverflowPlugin`). Подписка прямым `on` копила бы на них
	 * обработчики уничтоженных плагинов.
	 *
	 * **До принятия подписка только запоминается.** Набор собирают на
	 * монтирование, а принимает компонент фреймворк — и может не принять:
	 * сборку, отброшенную до показа, не уничтожит никто, и подписка, сделанная
	 * при установке, осталась бы на чужой шине навсегда. Принятие подключает
	 * отложенные подписки в порядке вызовов, после него метод подписывает сразу.
	 * Что плагин выводит из чужой шины, он перечитывает при принятии — см.
	 * {@link attach}. Уничтоженный плагин отложенные подписки забывает.
	 *
	 * На шину плагина — своего набора (`ctx.get(...)`) или набора элемента —
	 * подписываются прямым `on`: она умирает вместе с набором.
	 *
	 * Метод, а не пара `on`/`off` в каждом плагине: той паре нужно поле под
	 * каждый обработчик, а забытый `off` не виден — обработчик уничтоженного
	 * плагина ничего не делает, и шина копит его молча.
	 *
	 * Шины нет (у набора нет владельца, у движка нет расширения) —
	 * подписываться не на что. Имя события и обработчик сверяются по карте
	 * шины, как у `TEvented.on`.
	 *
	 * `TEvented` в типе шины — ради вывода карты, а не второй вид шины: из
	 * `TEvented<X>` в `IListenable` TypeScript карту не выводит (методы у
	 * `IListenable` обобщённые), а из `TEvented<X>` в `TEvented` — выводит.
	 * `IListenable` нужен шине владельца, которого плагин знает по контракту
	 * (`TListHeightPlugin`).
	 */
	protected _listenTo<
		TSource extends Record<string, (...args: any) => any>,
		K extends keyof TSource,
	>(
		source: TEvented<TSource> | IListenable<TSource> | null | undefined,
		event: K,
		handler: TSource[K],
	): void {
		if (!source || this._destroyed) return

		const subscribe: TSubscription = () => {
			source.on(event, handler)

			return () => source.off(event, handler)
		}

		if (this._attached) {
			this._unsubscribes.push(subscribe())
		} else {
			this._deferred.push(subscribe)
		}
	}
}
