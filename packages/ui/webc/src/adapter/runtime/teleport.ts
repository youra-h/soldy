/**
 * TTeleport — телепорт корня элемента soldy: аналог `<teleport :to>` Vue,
 * `Teleport` React, Svelte и Solid и `teleportRoot` Angular. Уводит корень в
 * цель по селектору — из-под `overflow` и контекстов наложения предков, — так
 * Frame уводит панель в `body`.
 *
 * Корень — элемент, который написал потребитель (`<div is="so-frame">`, см.
 * `SoldyElement`), и в цель уезжает он сам, как у Angular: класс, атрибуты и
 * слушатели потребителя остаются на панели без проброса. Ведёт перенос база
 * элемента — на первой раскладке связки и на смене цели или «на месте»
 * (`TRootSpec.teleport`).
 *
 * Своё у Web Components — жизненный цикл на колбэках DOM: перенос узла — это
 * отключение и подключение корня и всего, что в панели, а база заводит связку
 * на каждое подключение. Поэтому перенос телепорта — перенос силами базы
 * (`relocation.ts`): вызванные им колбэки связку не трогают ни у корня, ни у
 * элементов в панели.
 *
 * - В цель — одной операцией DOM, из документа корень не выходит: якорь-
 *   комментарий встаёт перед корнем, потом корень уезжает. Место корня — у
 *   якоря (`TPlaceContext.anchor`): поиск вверх от корня идёт к родителю
 *   якоря, и содержимое панели остаётся в контексте места — кнопка в панели
 *   видит локаль провайдера вокруг Frame. Связь ставится до переноса:
 *   элемент, собранный во время него, уже видит место.
 * - «На месте» (`contained` у Frame) — корень возвращается к якорю тоже одной
 *   операцией, якорь уходит; снова в цель — снова с якорем. Смена цели — тот
 *   же узел в новую цель.
 * - Цели нет — корень на месте, и база его прячет (`place` отдаёт `false`).
 *   Классы и наборы на нём остаются: сервера у Web Components нет, и пустого
 *   состояния слоя, как у Angular, не нужно.
 * - Панель ходит с местом. Якорь ушёл из документа вместе с контейнером
 *   потребителя — корень возвращается к якорю, в снятое поддерево, а у якоря
 *   без родителя просто уходит из цели. Это настоящее отключение: связки
 *   уничтожаются, а контейнер, вставленный снова, собирает и увозит панель
 *   заново. Следит за этим один `MutationObserver` на документ, пока в нём
 *   есть увезённые корни. Цель он не ищет: её ищут смена цели и «на месте»,
 *   как у Angular.
 * - Настоящее отключение увезённого корня — потребитель снял или переставил
 *   Frame — убирает якорь и связь в контексте места (`release`).
 *
 * В свете контейнера, который собирается после переноса (сборку контейнера
 * отложила регистрация), вместо корня стоит его якорь: раскладка света берёт
 * его за сам корень (`rootAt`) — слот у него от корня, и содержимое он.
 *
 * В бочку адаптера не входит: это механика базы.
 */

import { TPlaceContext } from '../context'
import { relocate } from './relocation'

/** Текст якоря, который стоит на месте корня, пока корень в цели. */
export const TELEPORT_ANCHOR = 'so-teleport'

/** Куда корню — значения состояния компонента. */
export type TTeleportPlace = {
	/** Селектор цели: `body`, `#layers`. `null` — цели нет. */
	readonly target: string | null
	/** Корень остаётся на месте, без переноса (`contained` у Frame). */
	readonly contained: boolean
}

/** Наблюдатель документа и телепорты, чьи места он сторожит. */
type TPlaceWatch = {
	readonly observer: MutationObserver
	readonly teleports: Set<TTeleport>
}

/** Что ловит наблюдатель места: состав поддерева — с ним из документа уходит якорь. */
const WATCHED: MutationObserverInit = { childList: true, subtree: true }

export class TTeleport {
	/** Наблюдатель на документ — один, пока в документе есть увезённые корни. */
	private static readonly _watches = new WeakMap<Document, TPlaceWatch>()

	/** Якорь → увезённый корень, чьё место он держит. */
	private static readonly _roots = new WeakMap<Node, Element>()

	/** Увезённый корень, чьё место держит узел, если узел — его якорь. */
	static rootAt(node: Node): Element | undefined {
		return TTeleport._roots.get(node)
	}

	/** Корень в цели — якорь на его месте; корень на месте — `null`. */
	private _anchor: Comment | null = null

	constructor(private readonly _root: Element) {}

	/**
	 * Приводит корень к месту: в цель по селектору или на место. Отдаёт, на своём
	 * ли месте корень — в цели или «на месте»; цели нет — `false`. Зовётся у
	 * подключённого корня.
	 */
	place({ target, contained }: TTeleportPlace): boolean {
		const root = this._root
		const wanted =
			contained || target === null ? null : root.ownerDocument.querySelector(target)

		if (wanted === null) this._home()
		else if (root.parentNode !== wanted) this._moveTo(wanted)

		return contained || wanted !== null
	}

	/**
	 * Настоящее отключение корня — потребитель снял или переставил его: якорь
	 * уходит с места, связь с ним — из контекста места.
	 */
	release(): void {
		const anchor = this._anchor

		if (anchor === null) return

		this._forget(anchor)
		anchor.remove()
	}

	/** Корень уезжает в цель; на месте — якорь, у увезённого — прежний. */
	private _moveTo(target: Element): void {
		const root = this._root

		if (this._anchor === null) {
			const anchor = root.ownerDocument.createComment(TELEPORT_ANCHOR)

			root.before(anchor)
			TPlaceContext.anchor(root, anchor)
			TTeleport._roots.set(anchor, root)
			TTeleport._watch(this, anchor)
			this._anchor = anchor
		}

		relocate([root], () => target.appendChild(root))
	}

	/**
	 * Корень возвращается к якорю — одной операцией, якорь уходит. Якорь без
	 * родителя места не держит, и корень просто уходит из цели.
	 */
	private _home(): void {
		const root = this._root
		const anchor = this._anchor

		if (anchor === null) return

		this._forget(anchor)

		if (anchor.parentNode) relocate([root], () => anchor.replaceWith(root))
		else root.remove()
	}

	/**
	 * Якорь ушёл из документа — корень уходит за ним, в снятое поддерево. Это
	 * настоящее отключение, а не перенос базы: корень из документа уходит, и
	 * связки уничтожаются.
	 */
	private _follow(): void {
		const root = this._root
		const anchor = this._anchor

		if (anchor === null || anchor.isConnected) return

		this._forget(anchor)

		if (anchor.parentNode) anchor.replaceWith(root)
		else root.remove()
	}

	/** Корень больше не увезён: связи якоря и наблюдение снимаются. */
	private _forget(anchor: Comment): void {
		this._anchor = null
		TPlaceContext.unanchor(this._root)
		TTeleport._roots.delete(anchor)
		TTeleport._unwatch(this, anchor.ownerDocument)
	}

	/**
	 * Место увезённого корня — под наблюдением документа. Якорь в теневом дереве
	 * — ещё и его корня: состав теневых деревьев документ не видит.
	 */
	private static _watch(teleport: TTeleport, anchor: Comment): void {
		const owner = anchor.ownerDocument
		let watch = TTeleport._watches.get(owner)

		if (watch === undefined) {
			const teleports = new Set<TTeleport>()
			// Копия: корень, ушедший за местом, снимается с наблюдения
			const observer = new MutationObserver(() => {
				for (const each of [...teleports]) each._follow()
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

	/** Корень больше не увезён; последний в документе снимает наблюдатель. */
	private static _unwatch(teleport: TTeleport, owner: Document): void {
		const watch = TTeleport._watches.get(owner)

		if (watch === undefined) return

		watch.teleports.delete(teleport)

		if (watch.teleports.size > 0) return

		watch.observer.disconnect()
		TTeleport._watches.delete(owner)
	}
}
