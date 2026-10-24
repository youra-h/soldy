import type { IPlainExtension, TActionEvent, TClearEvent, TRemoveEvent } from '@soldy-ui/core'
import type { TCollectionElements } from './collection-elements.plugin'

/**
 * Что решает плагин: где корень, что запомнить о месте элемента и куда отдать
 * фокус.
 */
export type TLeavingFocusHost<TItem, TPlace> = {
	/**
	 * Узел корня владельца. `null` — узла нет, и фокус не читается: закрыть
	 * элемент из кода можно и на сервере, где документа нет.
	 */
	readonly root: () => Element | null
	/**
	 * Что о месте элемента известно только до его удаления, кроме узла: у
	 * тега — соседи. Зовётся, когда фокус оказался в узле уходящего элемента.
	 */
	readonly place: (item: TItem) => TPlace
	/**
	 * Отдать фокус: элемент закрыли, он ушёл, а фокус — в его узле или потерян
	 * вместе с ним.
	 */
	readonly pass: (root: Element, place: TPlace) => void
}

/**
 * Элемент с фокусом, который уходит из коллекции, — и то, что о нём известно
 * только до удаления: узел и место. Фокус переходит, когда сошлись оба
 * факта — элемент закрыли и он ушёл.
 */
type TLeaving<TItem, TPlace> = {
	/** Элемент, в узле которого фокус. */
	item: TItem
	/** Узел элемента: фокус, который отсюда успели увести, помощник не трогает. */
	node: Element
	/** Что о месте элемента нужно плагину. */
	place: TPlace
	/**
	 * Удаление, с которым элемент уходит. Отменённое узнаётся по нему, а не по
	 * элементу: удаление того же элемента позже придёт с другим событием.
	 */
	removal?: TActionEvent
	/** Элемент закрыли — `close`. */
	closed: boolean
	/** Элемент ушёл из коллекции — состав без него. */
	left: boolean
}

/**
 * Фокус уходящего элемента коллекции — элемента, который закрыли: клавишей,
 * крестиком, из кода. Узел элемента уходит из документа, и фокус, стоявший в
 * нём, ушёл бы на страницу: следующий Tab начинал бы обход заново.
 *
 * Правило одно на коллекции с закрытием — Tags и Tabs, поэтому ожидание —
 * модуль, а не копия в каждом плагине. Плагин слушает закрытие своего
 * расширения и решает, что запомнить о месте элемента и куда отдать фокус
 * (`host`), а когда переносить фокус и переносить ли вообще — помощник.
 *
 * Фокус переходит, когда сошлись два факта: элемент закрыли (`close` — плагин
 * зовёт его из `item:close` своего расширения) и элемент ушёл из коллекции
 * (`change:items` у `plain`), — вторым из них. Порядок у фактов разный:
 * обычно элемент удаляет само закрытие, следом за `item:close`, но подписчик
 * закрытия, стоящий раньше плагина, снимает его ещё в своём обработчике —
 * так поле Select снимает выбор с опции, а приложение может удалить таб из
 * своего обработчика события фасада, — и элемент уходит раньше, чем закрытие
 * дойдёт до плагина.
 *
 * «Ушёл» — `change:items`, а не `item:removed`: `plain` отдаёт события
 * драйвера пробросом, а проброс срабатывает раньше обработчиков самого
 * драйвера. На `item:removed` расширения коллекции на удаление ещё не
 * ответили — Tabs не активировал соседа закрытого активного таба, —
 * а `change:items` драйвер шлёт после всех `item:*` записи.
 *
 * Где фокус, видно только до удаления: после него узла элемента нет в
 * реестре, а места — в коллекции. Поэтому узел и место (`host.place`) снимает
 * и закрытие, и хук удаления (`item:remove:before`, `items:clear:before`).
 * Переносится только фокус из узла уходящего элемента. Фокус, который увели,
 * пока элемент уходил, остаётся, где его поставили; потерянный — ушедший на
 * страницу вместе с узлом, который разметка сняла синхронно, — переносится,
 * как стоявший в узле.
 *
 * Удаление, отменённое в хуке, фокус не трогает. Элемент, ушедший без
 * закрытия, — снятый из данных или размонтированный, — фокус не переносит:
 * иначе набор, который снимают целиком, гонял бы фокус по своим уходящим
 * элементам. Такое ожидание висит до следующего ухода или закрытия элемента с
 * фокусом, смены движка (`bind`) или сброса (`reset`): ожидание одно на
 * коллекцию. Фокус помощник читает только при узле корня.
 */
export class TLeavingFocus<TItem extends object, TPlace> {
	private _plain: IPlainExtension<TItem> | null = null
	private _leaving: TLeaving<TItem, TPlace> | undefined

	constructor(
		private readonly _elements: TCollectionElements | null,
		private readonly _host: TLeavingFocusHost<TItem, TPlace>,
	) {}

	/**
	 * Движок сменился — хуки удаления и состав слушаются у нового, ожидание
	 * прежнего забыто. `null` — снять подписки.
	 */
	bind(plain: IPlainExtension<TItem> | null): void {
		const previous = this._plain?.events

		previous?.off('item:remove:before', this._onRemoveBefore)
		previous?.off('items:clear:before', this._onClearBefore)
		previous?.off('change:items', this._onItems)

		this._plain = plain
		this._leaving = undefined

		plain?.events.on('item:remove:before', this._onRemoveBefore)
		plain?.events.on('items:clear:before', this._onClearBefore)
		plain?.events.on('change:items', this._onItems)
	}

	/**
	 * Элемент закрывают. Обычно он ещё в коллекции — закрытие удалит его
	 * следом, и фокус перейдёт на его уходе. Но подписчик закрытия, стоящий
	 * раньше плагина, мог уже снять его — и тогда фокус переходит сейчас.
	 */
	close(item: TItem): void {
		this._dropCancelled()

		const leaving = this._leaving

		if (leaving?.item === item) {
			leaving.closed = true
			this._settle(leaving)

			return
		}

		this._capture(item, { closed: true })
	}

	/** Забыть ожидание: узел корня снят. */
	reset(): void {
		this._leaving = undefined
	}

	private readonly _onRemoveBefore = (event: TRemoveEvent<TItem>): void =>
		this._prepare([event.item], event)

	private readonly _onClearBefore = (event: TClearEvent<TItem>): void =>
		this._prepare(event.items, event)

	/**
	 * Элементы вот-вот уйдут — пока их узлы в реестре, а места в коллекции,
	 * снять, не в них ли фокус и где они стоят. Уходит закрываемый элемент —
	 * его удаление запоминается: отменят — фокус останется на месте.
	 */
	private _prepare(items: readonly TItem[], removal: TActionEvent): void {
		this._dropCancelled()

		const leaving = this._leaving

		if (leaving && items.includes(leaving.item)) {
			leaving.removal = removal

			return
		}

		for (const item of items) {
			if (this._capture(item, { closed: false, removal })) return
		}
	}

	/**
	 * Состав сменился — ушёл ли элемент. Драйвер шлёт `change:items` один раз
	 * на запись, после всех её `item:*`, когда расширения коллекции на них уже
	 * ответили.
	 */
	private readonly _onItems = (items: readonly TItem[]): void => {
		const leaving = this._leaving

		if (!leaving || items.includes(leaving.item)) return

		leaving.left = true
		this._settle(leaving)
	}

	/**
	 * Запомнить фокус элемента, если он в его узле, — вместе с местом
	 * элемента. Чтение фокуса — только при узле корня: на сервере документа
	 * нет.
	 *
	 * @returns запомнил ли — был ли фокус в узле элемента.
	 */
	private _capture(
		item: TItem,
		state: Pick<TLeaving<TItem, TPlace>, 'closed' | 'removal'>,
	): boolean {
		const root = this._host.root()
		const node = root ? (this._elements?.getElementByItem(item) ?? null) : null
		const active = root?.ownerDocument.activeElement

		if (!node || !active || !node.contains(active)) return false

		this._leaving = { item, node, place: this._host.place(item), left: false, ...state }

		return true
	}

	/**
	 * Удаление отменили (`item:remove:before`, `items:clear:before`) — элемент
	 * на месте, и фокус остаётся с ним. Видно это только после хука, поэтому
	 * ожидание сбрасывает следующее закрытие или удаление.
	 */
	private _dropCancelled(): void {
		if (this._leaving?.removal?.defaultPrevented) this._leaving = undefined
	}

	/** Элемент закрыли, и он ушёл — фокус переходит. */
	private _settle(leaving: TLeaving<TItem, TPlace>): void {
		if (!leaving.closed || !leaving.left) return

		this._leaving = undefined
		this._pass(leaving)
	}

	/**
	 * Фокус, который увели из узла элемента, пока тот уходил, остаётся, где
	 * его поставили. Потерянный — ушедший на страницу вместе с узлом, который
	 * разметка сняла синхронно, — переносится, как стоявший в узле.
	 */
	private _pass(leaving: TLeaving<TItem, TPlace>): void {
		const root = this._host.root()

		if (!root) return

		const { activeElement, body } = root.ownerDocument

		if (activeElement && activeElement !== body && !leaving.node.contains(activeElement)) return

		this._host.pass(root, leaving.place)
	}
}
