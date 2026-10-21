/**
 * TTeleport — телепорт корня элемента soldy: аналог `<teleport :to>` Vue,
 * `Teleport` React, Svelte и Solid и `teleportRoot` Angular. Уводит корень в
 * цель по селектору — из-под `overflow` и контекстов наложения предков, — так
 * Frame уводит панель в `body`.
 *
 * Корень — обычно элемент, который написал потребитель (`<div is="so-frame">`,
 * см. `SoldyElement`), и в цель уезжает он сам, как у Angular: класс, атрибуты
 * и слушатели потребителя остаются на панели без проброса. У обёртки корень —
 * узел шаблона внутри элемента (`TRootSpec.wrapped`): регион тостов в
 * `<so-toasts>`, — и в цель уезжает он, а элемент со светом — приложением —
 * остаётся на месте. Ведёт перенос база элемента — на первой раскладке связки
 * и на смене цели или «на месте» (`TRootSpec.teleport`).
 *
 * Спутник корня (`TTemplateParts.companion`) — узел шаблона рядом с корнем:
 * подложка окна и выезжающей панели, сосед панели в телепорте Vue. Он стоит
 * прямо перед корнем — в цели, на месте и без цели — и ездит вместе с ним той
 * же операцией: в цель, обратно и за местом.
 *
 * Своё у Web Components — жизненный цикл на колбэках DOM: перенос узла — это
 * отключение и подключение корня и всего, что в панели, а база заводит связку
 * на каждое подключение. Поэтому перенос телепорта — перенос силами базы
 * (`relocation.ts`): вызванные им колбэки связку не трогают ни у корня, ни у
 * элементов в панели.
 *
 * - В цель — каждый узел одной операцией DOM, из документа он не выходит:
 *   якорь-комментарий встаёт перед корнем, потом спутник и корень уезжают.
 *   Место корня — у якоря (`TPlaceContext.anchor`): поиск вверх от корня идёт
 *   к родителю якоря, и содержимое панели остаётся в контексте места — кнопка
 *   в панели видит локаль провайдера вокруг Frame, тост — лифт менеджера
 *   вокруг региона. Связь ставится до переноса: элемент, собранный во время
 *   него, уже видит место.
 * - «На месте» (`contained` у Frame и Drawer) — спутник и корень
 *   возвращаются к якорю тоже каждый одной операцией, якорь уходит; снова в
 *   цель — снова с якорем. Смена цели — те же узлы в новую цель.
 * - Цели нет — корень на месте, и база его прячет (`place` отдаёт `false`)
 *   вместе со спутником. Классы и наборы на нём остаются: сервера у Web
 *   Components нет, и пустого состояния слоя, как у Angular, не нужно.
 * - Панель ходит с местом. Якорь ушёл из документа вместе с контейнером
 *   потребителя — корень со спутником возвращаются к якорю, в снятое
 *   поддерево, а у якоря без родителя просто уходят из цели. Это настоящее
 *   отключение: связки уничтожаются, а контейнер, вставленный снова, собирает
 *   и увозит панель заново. Следит за этим один `MutationObserver` на
 *   документ, пока в нём есть увезённые корни. Цель он не ищет: её ищут смена
 *   цели и «на месте», как у Angular.
 * - Настоящее отключение элемента (`release`) — потребитель снял или
 *   переставил его. Корень-элемент своё место оставил: якорь уходит, связь в
 *   контексте места — тоже, а спутник — из цели или с места. Корень внутри
 *   элемента-обёртки, наоборот, уходит за местом: место — в самом элементе, и
 *   корень возвращается к якорю, как у снятого контейнера, — регион тостов не
 *   остаётся в `body` без менеджера.
 *
 * В свете контейнера, который собирается после переноса (сборку контейнера
 * отложила регистрация), вместо корня стоит его якорь, а спутник, если корень
 * на месте, — рядом с ним: раскладка света берёт их за сам корень (`rootAt`) —
 * слот у них от корня, и содержимое они.
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
	/** Корень остаётся на месте, без переноса (`contained` у Frame и Drawer). */
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

	/**
	 * Узел → корень, за который он стоит в свете контейнера: якорь увезённого
	 * корня — пока держит его место, спутник — всегда.
	 */
	private static readonly _roots = new WeakMap<Node, Element>()

	/**
	 * Корень, за который стоит узел в свете контейнера: якорь увезённого корня —
	 * на его месте, спутник — рядом с ним. Иначе — `undefined`.
	 */
	static rootAt(node: Node): Element | undefined {
		return TTeleport._roots.get(node)
	}

	/** Корень в цели — якорь на его месте; корень на месте — `null`. */
	private _anchor: Comment | null = null

	/**
	 * @param _host элемент потребителя: сам корень или обёртка вокруг него
	 * @param _root корень, который уезжает в цель
	 * @param _companion спутник корня — узел шаблона перед корнем; нет — `null`
	 */
	constructor(
		private readonly _host: Element,
		private readonly _root: Element = _host,
		private readonly _companion: Element | null = null,
	) {
		if (_companion !== null) TTeleport._roots.set(_companion, _root)
	}

	/**
	 * Приводит корень к месту: в цель по селектору или на место. Спутник встаёт
	 * прямо перед корнем, где бы тот ни стоял. Отдаёт, на своём ли месте корень
	 * — в цели или «на месте»; цели нет — `false`. Зовётся у подключённого
	 * элемента.
	 */
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
	 * Настоящее отключение элемента — потребитель снял или переставил его.
	 * Корень-элемент своё место оставил: якорь уходит с места, связь с ним — из
	 * контекста места, спутник — из цели или с места. Корень внутри обёртки
	 * уходит за местом — к якорю в самом элементе, вместе со спутником (см.
	 * шапку). Подключение вернёт спутника к корню и увезёт корень заново.
	 */
	release(): void {
		const anchor = this._anchor
		const inside = this._root !== this._host

		if (anchor !== null) {
			this._forget(anchor)

			if (inside) this._return(anchor)
			else anchor.remove()
		}

		if (!inside) this._companion?.remove()
	}

	/** Узлы, которые ездят: спутник раньше корня. */
	private _nodes(): Element[] {
		return this._companion === null ? [this._root] : [this._companion, this._root]
	}

	/** Корень со спутником уезжают в цель; на месте — якорь, у увезённого — прежний. */
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

		const nodes = this._nodes()

		relocate(nodes, () => {
			for (const node of nodes) target.appendChild(node)
		})
	}

	/**
	 * Корень со спутником возвращаются к якорю — каждый одной операцией, якорь
	 * уходит. Это перенос силами базы: из документа узлы не выходят. Якорь без
	 * родителя места не держит, и они просто уходят из цели.
	 */
	private _home(): void {
		const anchor = this._anchor

		if (anchor === null) return

		this._forget(anchor)
		relocate(this._nodes(), () => this._return(anchor))
	}

	/**
	 * Спутник — прямо перед корнем, где бы корень ни стоял: на первой раскладке
	 * спутник ещё вне документа, а после настоящего отключения его сняли.
	 */
	private _escort(): void {
		const companion = this._companion
		const root = this._root
		const parent = root.parentNode

		if (companion === null || parent === null || companion.nextSibling === root) return

		relocate([companion], () => parent.insertBefore(companion, root))
	}

	/**
	 * Якорь ушёл из документа — корень со спутником уходят за ним, в снятое
	 * поддерево. Это настоящее отключение, а не перенос базы: корень из
	 * документа уходит, и связки уничтожаются.
	 */
	private _follow(): void {
		const anchor = this._anchor

		if (anchor === null || anchor.isConnected) return

		this._forget(anchor)
		this._return(anchor)
	}

	/**
	 * Корень со спутником — к якорю, каждый одной операцией, якорь уходит;
	 * якорь без родителя — они просто уходят. Само по себе это настоящее
	 * отключение: место корня уже вне документа или переставлено потребителем
	 * (`_follow`, `release`). «На месте» (`_home`) зовёт его переносом силами
	 * базы.
	 */
	private _return(anchor: Comment): void {
		const nodes = this._nodes()

		if (!anchor.parentNode) {
			for (const node of nodes) node.remove()

			return
		}

		for (const node of nodes) anchor.before(node)

		anchor.remove()
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
