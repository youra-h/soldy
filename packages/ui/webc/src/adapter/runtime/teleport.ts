/**
 * Телепорт корня слоя — аналог `<teleport :to>`: уводит корень со спутником
 * (подложкой) в цель по селектору, на месте оставляет якорь-комментарий, и
 * поиск по месту от корня идёт к якорю. Панель ходит с местом: место
 * пересобрано или снято — корень возвращается к якорю переносом с
 * пересборкой. Путей к этому два: колбэки хозяина места (`recall`) и
 * наблюдатель документа для мест без хозяина. AGENTS.md (Web Components),
 * «Телепорт слоя» и «Панель ходит с местом».
 */

import { TPlaceContext } from '../context'
import { isPlaceOwner } from './marks'
import { isRelocating, owe, rebuild, relocate } from './relocation'
import { connecting } from './waiting'

/** Текст якоря, который стоит на месте корня, пока корень в цели. */
export const TELEPORT_ANCHOR = 'so-teleport'

export type TTeleportPlace = {
	/** Селектор цели; `null` — цели нет. */
	readonly target: string | null
	readonly contained: boolean
}

type TPlaceWatch = {
	readonly observer: MutationObserver
	readonly teleports: Set<TTeleport>
}

const WATCHED: MutationObserverInit = { childList: true, subtree: true }

function removedIn(records: readonly MutationRecord[]): Set<Node> {
	const removed = new Set<Node>()

	for (const record of records) {
		for (const node of record.removedNodes) removed.add(node)
	}

	return removed
}

/** Хозяева мест внутри узла — в свете и в открытых теневых корнях. */
function ownersWithin(scope: ParentNode): Element[] {
	const found: Element[] = []

	for (const element of scope.querySelectorAll('*')) {
		if (isPlaceOwner(element)) found.push(element)
		if (element.shadowRoot) found.push(...ownersWithin(element.shadowRoot))
	}

	return found
}

export class TTeleport {
	private static readonly _watches = new WeakMap<Document, TPlaceWatch>()

	/** Узел → корень, за который он стоит в свете контейнера: якорь и спутник. */
	private static readonly _roots = new WeakMap<Node, Element>()

	static rootAt(node: Node): Element | undefined {
		return TTeleport._roots.get(node)
	}

	/** Панели места хозяина — к якорям: он пересобран или снят со страницы. */
	static recall(owner: Element): void {
		const watch = TTeleport._watches.get(owner.ownerDocument)

		if (watch === undefined) return

		TTeleport._followAll([...watch.teleports].filter((each) => each._owner() === owner))
	}

	private _anchor: Comment | null = null

	constructor(
		private readonly _host: Element,
		private readonly _root: Element = _host,
		private readonly _companion: Element | null = null,
	) {
		if (_companion !== null) TTeleport._roots.set(_companion, _root)
	}

	/** В цель или на место; отдаёт, на своём ли месте корень (цели нет — `false`). */
	place({ target, contained }: TTeleportPlace): boolean {
		const root = this._root
		const wanted =
			contained || target === null ? null : root.ownerDocument.querySelector(target)

		if (wanted === null) this._home()
		else if (root.parentNode !== wanted) this._moveTo(wanted)

		this._escort()

		return contained || wanted !== null
	}

	/**
	 * Настоящее отключение корня-элемента: якорь и спутник уходят, а элементам
	 * в корне — долг, их отключение от той же операции настоящее.
	 */
	release(): void {
		if (this._root !== this._host) return

		owe(ownersWithin(this._root))

		const anchor = this._anchor

		if (anchor !== null) {
			this._forget(anchor)
			anchor.remove()
		}

		this._companion?.remove()
	}

	private _nodes(): Element[] {
		return this._companion === null ? [this._root] : [this._companion, this._root]
	}

	private _moveTo(target: Element): void {
		const root = this._root

		if (this._anchor === null) {
			const anchor = root.ownerDocument.createComment(TELEPORT_ANCHOR)

			root.before(anchor)
			// Связь места — до переноса: собранное во время него уже видит место
			TPlaceContext.anchor(root, anchor)
			TTeleport._roots.set(anchor, root)
			TTeleport._watch(this, anchor)
			this._anchor = anchor
		}

		const nodes = this._nodes()

		relocate(nodes, () => {
			for (const node of nodes) target.appendChild(node)
		})
	}

	private _home(): void {
		const anchor = this._anchor

		if (anchor === null) return

		this._forget(anchor)
		relocate(this._nodes(), () => this._return(anchor))
	}

	/** Спутник — прямо перед корнем, где бы тот ни стоял. */
	private _escort(): void {
		const companion = this._companion
		const root = this._root
		const parent = root.parentNode

		if (companion === null || parent === null || companion.nextSibling === root) return

		relocate([companion], () => parent.insertBefore(companion, root))
	}

	/** Хозяин места — ближайший элемент базы вверх от якоря, в момент вопроса. */
	private _owner(): Node | null {
		if (this._anchor === null) return null

		for (const node of TPlaceContext.ancestors(this._anchor)) {
			if (isPlaceOwner(node)) return node
		}

		return null
	}

	/** Якорь ушёл, или узел на пути до хозяина снят в этой пачке — и не базой. */
	private _displaced(removed: ReadonlySet<Node>): boolean {
		const anchor = this._anchor

		if (anchor === null) return false
		if (!anchor.isConnected) return true
		if (removed.size === 0) return false

		for (
			let node: Node | null = anchor;
			node !== null && !isPlaceOwner(node);
			node = TPlaceContext.above(node)
		) {
			if (removed.has(node) && !isRelocating(node)) return true
		}

		return false
	}

	/**
	 * К якорю с пересборкой: признак прежнего переноса базы, который ещё держится
	 * над панелью, настоящего отключения не глушит.
	 */
	private _follow(): void {
		const anchor = this._anchor

		if (anchor === null) return

		this._forget(anchor)
		rebuild(this._nodes(), () => this._return(anchor))
	}

	/** Одним подключением: корни собираются, когда браузер довёл колбэки всех панелей. */
	private static _followAll(teleports: readonly TTeleport[]): void {
		if (teleports.length === 0) return

		connecting(() => {
			for (const each of teleports) each._follow()
		})
	}

	private _return(anchor: Comment): void {
		const nodes = this._nodes()

		if (!anchor.parentNode) {
			for (const node of nodes) node.remove()

			return
		}

		for (const node of nodes) anchor.before(node)

		anchor.remove()
	}

	private _forget(anchor: Comment): void {
		this._anchor = null
		TPlaceContext.unanchor(this._root)
		TTeleport._roots.delete(anchor)
		TTeleport._unwatch(this, anchor.ownerDocument)
	}

	/** Якорь в теневом дереве — наблюдать и его корень: документ его состава не видит. */
	private static _watch(teleport: TTeleport, anchor: Comment): void {
		const owner = anchor.ownerDocument
		let watch = TTeleport._watches.get(owner)

		if (watch === undefined) {
			const teleports = new Set<TTeleport>()
			// Копия: корень, ушедший за местом, снимается с наблюдения
			const observer = new MutationObserver((records) => {
				const removed = removedIn(records)

				TTeleport._followAll([...teleports].filter((each) => each._displaced(removed)))
			})

			observer.observe(owner, WATCHED)
			watch = { observer, teleports }
			TTeleport._watches.set(owner, watch)
		}

		watch.teleports.add(teleport)

		for (
			let scope = anchor.getRootNode();
			scope instanceof ShadowRoot;
			scope = scope.host.getRootNode()
		) {
			watch.observer.observe(scope, WATCHED)
		}
	}

	private static _unwatch(teleport: TTeleport, owner: Document): void {
		const watch = TTeleport._watches.get(owner)

		if (watch === undefined) return

		watch.teleports.delete(teleport)

		if (watch.teleports.size > 0) return

		watch.observer.disconnect()
		TTeleport._watches.delete(owner)
	}
}
