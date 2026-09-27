import type { IExtension, IExtensionContext } from './types'
import { TEvented } from '@soldy-ui/core'

/**
 * Абстрактное расширение — устраняет повторяющийся код:
 * `events`, `_ctx`, `install()`, подписки на чужие шины и их снятие.
 *
 * @template T      — тип элемента коллекции
 * @template TEvents — тип событий расширения
 */
export abstract class TBaseExtension<
	TItem extends object,
	TEvents extends Record<string, (...args: any) => any>,
> implements IExtension<TItem, TEvents> {
	abstract readonly name: string

	readonly events = new TEvented<TEvents>()

	protected _ctx!: IExtensionContext<TItem>

	/**
	 * Отписки от чужих шин, на которые расширение подписалось через
	 * {@link _listenTo}. Их снимает `destroy()`, а подписка, снятая раньше,
	 * уходит отсюда сама.
	 */
	private readonly _unsubscribes = new Set<() => void>()

	install(ctx: IExtensionContext<TItem>): void {
		this._ctx = ctx
	}

	/**
	 * Снимает подписки {@link _listenTo} и очищает свою шину: исходящие
	 * релеи (`relay` на шину владельца), перехватчики и входящие подписки.
	 * Повторный вызов снимать уже нечего.
	 */
	destroy(): void {
		for (const unsubscribe of [...this._unsubscribes]) unsubscribe()

		this.events.destroy()
	}

	/**
	 * Подписаться на шину, которая живёт дольше расширения: подписку снимет
	 * `destroy()`.
	 *
	 * Такие шины — у драйвера и соседних расширений (движок переживает
	 * владельца, когда пришёл снаружи), у владельца (свой `ctrl` приложения
	 * переживает монтирование) и у элементов (элемент из данных остаётся в
	 * движке). Владельческое расширение уходит вместе с владельцем
	 * (`releaseEngine`), и подписка прямым `on` оставила бы на этих шинах
	 * обработчик мёртвого расширения — он продолжал бы писать элементам
	 * свойства ушедшего владельца.
	 *
	 * Отписка возвращается: подписку на элемент снимают раньше — когда элемент
	 * уходит из коллекции. Шины нет (у движка нет соседнего расширения) —
	 * подписываться не на что, и отписка ничего не делает. Имя события и
	 * обработчик сверяются по карте шины, как у `TEvented.on`.
	 *
	 * Тот же приём, что `TBasePlugin._listenTo` у плагинов (`@soldy-ui/plugins`).
	 */
	protected _listenTo<
		TSource extends Record<string, (...args: any) => any>,
		K extends keyof TSource,
	>(source: TEvented<TSource> | null | undefined, event: K, handler: TSource[K]): () => void {
		if (!source) return () => {}

		source.on(event, handler)

		const unsubscribe = (): void => {
			source.off(event, handler)
			this._unsubscribes.delete(unsubscribe)
		}

		this._unsubscribes.add(unsubscribe)

		return unsubscribe
	}
}
