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
 * - Настоящее отключение корня-элемента (`release`) — потребитель снял или
 *   переставил сам Frame, окно или выезжающую панель: место корень оставил, и
 *   якорь уходит с места, связь в контексте места — тоже, а спутник — из цели
 *   или с места. Подключение увезёт корень заново, со спутником. Элементы
 *   soldy в корне переставила та же операция, и их отключение от неё —
 *   настоящее, даже когда браузер доводит его внутри переноса корня в цель
 *   (долг, `relocation.ts`): они собираются заново после корня, в контексте
 *   его нового места.
 *
 * Панель ходит с местом. Увезённый корень принадлежит месту, где стоит его
 * якорь: место ушло со страницы — корень уходит за ним, место пересобрано —
 * корень пересобирается вместе с ним и после того, кто его пересобрал.
 * Действие одно — возврат к якорю переносом с пересборкой (`_follow`,
 * `rebuild` в `relocation.ts`): корень со спутником встают на место якоря,
 * якорь уходит, а корень и всё, что в панели, по-настоящему отключаются и,
 * если место в документе, подключаются на нём. Первая раскладка новой связки
 * увозит корень в цель заново. Путей к действию два, и оба зовут его сразу,
 * без таймера:
 *
 * - хозяин места — ближайший элемент soldy вверх от якоря по месту (метка
 *   базы, `soldy-mark.ts`; вверх — как ищет `TPlaceContext`): меню, поповер,
 *   подсказка, подменю, элемент вокруг Frame потребителя, `<so-toasts>` для
 *   своего региона. Ищется он в момент вопроса, а не при постановке якоря:
 *   раскладка света переносит якорь и в деталь. Колбэки хозяина синхронны, и
 *   действие зовёт его база (`recall`): хозяин снят со страницы — панели его
 *   места сразу уходят за ним; хозяин подключён повторно — панели возвращаются
 *   сразу после его новой сборки, внутри его подключения. Их колбэки встают в
 *   ожидание (`waiting.ts`), и панель собирается после хозяина, с его новым
 *   лифтом: пункты меню входят в коллекцию его новой сборки. Ближайший хозяин
 *   подключается последним из предков якоря, поэтому вложенность — меню,
 *   подменю в его панели, панель подменю — складывается сама. Регион тостов —
 *   тоже панель своего хозяина: якорь региона стоит в самом `<so-toasts>`;
 * - наблюдатель документа — для мест, где хозяин не пересобирался: Frame в
 *   обычном контейнере или контейнер внутри хозяина. Один `MutationObserver`
 *   на документ, пока в нём есть увезённые корни. Ловит он якорь, ушедший из
 *   документа, и узел на пути от якоря (он тоже в счёт) до хозяина, снятый в
 *   этой пачке записей не силами базы (`isRelocating`), — место переставил
 *   потребитель. Путь обрывается на хозяине: снятое выше него уже обработал
 *   его колбэк, и второй пересборки нет. Снятых узлов в пачке нет — делать
 *   нечего. Цель наблюдатель не ищет: её ищут смена цели и «на месте», как у
 *   Angular.
 *
 * Возврат к якорю идёт как подключение (`connecting`): корни и элементы в
 * панелях собираются, когда возврат кончился, и сборка корня, которая снова
 * увозит его в цель, не приходится на колбэки элементов его панели, ещё не
 * доведённые браузером. Иначе их настоящее отключение пришло бы при признаке
 * переноса, база сочла бы его своим, и кнопка в панели осталась бы собранной
 * для прежнего места. По той же причине сам возврат — перенос с пересборкой:
 * о колбэке решает последний перенос на пути, и признак переноса силами
 * базы, который ещё держится в панели или над ней, — её увезли в той же
 * задаче, подменю возвращается в панель меню, которую только что увезли, —
 * настоящего отключения не глушит.
 *
 * В свете контейнера, который собирается после переноса (сборку контейнера
 * отложила регистрация), вместо корня стоит его якорь, а спутник, если корень
 * на месте, — рядом с ним: раскладка света берёт их за сам корень (`rootAt`) —
 * слот у них от корня, и содержимое они.
 *
 * В бочку адаптера не входит: это механика базы.
 */

import { TPlaceContext } from '../context'
import { isRelocating, owe, rebuild, relocate } from './relocation'
import { isSoldyElement } from './soldy-mark'
import { connecting } from './waiting'

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

/**
 * Что ловит наблюдатель места: состав поддерева — с ним из документа уходит
 * якорь, и им же потребитель переставляет место.
 */
const WATCHED: MutationObserverInit = { childList: true, subtree: true }

/** Узлы, снятые в пачке записей наблюдателя. */
function removedIn(records: readonly MutationRecord[]): Set<Node> {
	const removed = new Set<Node>()

	for (const record of records) {
		for (const node of record.removedNodes) removed.add(node)
	}

	return removed
}

/**
 * Элементы soldy внутри узла, сам узел не в счёт: в свете и в открытых
 * теневых корнях — операция DOM над узлом зовёт колбэки и им. Закрытый
 * теневой корень снаружи не виден.
 */
function soldyWithin(scope: ParentNode): Element[] {
	const found: Element[] = []

	for (const element of scope.querySelectorAll('*')) {
		if (isSoldyElement(element)) found.push(element)
		if (element.shadowRoot) found.push(...soldyWithin(element.shadowRoot))
	}

	return found
}

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

	/**
	 * Панели места этого элемента — к якорям (см. шапку, «Панель ходит с
	 * местом»): элемент собран заново — они соберутся следом за ним, снят со
	 * страницы — уйдут за ним. Зовёт база элемента из его колбэков.
	 */
	static recall(owner: Element): void {
		const watch = TTeleport._watches.get(owner.ownerDocument)

		if (watch === undefined) return

		TTeleport._followAll([...watch.teleports].filter((each) => each._owner() === owner))
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
	 * Настоящее отключение корня-элемента — потребитель снял или переставил его:
	 * место он оставил, и якорь уходит с места, связь с ним — из контекста
	 * места, спутник — из цели или с места. Подключение вернёт спутника к корню
	 * и увезёт корень заново. Элементы soldy в корне переставила та же
	 * операция: их отключение от неё — настоящее, даже доведённое браузером
	 * внутри переноса корня в цель, который сделает подключение (долг,
	 * `relocation.ts`). Долг — был корень в цели или нет: `contained` и цель,
	 * записанные вне документа, увезут его при подключении. Корень внутри
	 * обёртки своё место не оставляет: якорь — в самом элементе, и за местом
	 * корень идёт по общему правилу (`recall`, см. шапку).
	 */
	release(): void {
		if (this._root !== this._host) return

		owe(soldyWithin(this._root))

		const anchor = this._anchor

		if (anchor !== null) {
			this._forget(anchor)
			anchor.remove()
		}

		this._companion?.remove()
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
	 * Хозяин места — ближайший элемент soldy вверх от якоря по месту (см.
	 * шапку); нет такого — `null`.
	 */
	private _owner(): Node | null {
		const anchor = this._anchor

		for (
			let node = anchor === null ? null : TPlaceContext.above(anchor);
			node !== null;
			node = TPlaceContext.above(node)
		) {
			if (isSoldyElement(node)) return node
		}

		return null
	}

	/**
	 * Место ушло или переставлено мимо хозяина — вопрос наблюдателя (см.
	 * шапку): якорь ушёл из документа, или узел на пути от якоря до хозяина
	 * места снят в этой пачке, и снят не базой.
	 */
	private _displaced(removed: ReadonlySet<Node>): boolean {
		const anchor = this._anchor

		if (anchor === null) return false
		if (!anchor.isConnected) return true
		if (removed.size === 0) return false

		for (
			let node: Node | null = anchor;
			node !== null && !isSoldyElement(node);
			node = TPlaceContext.above(node)
		) {
			if (removed.has(node) && !isRelocating(node)) return true
		}

		return false
	}

	/**
	 * Корень идёт за местом — к якорю переносом с пересборкой (`rebuild`), не
	 * силами базы: связки уничтожаются, а место в документе собирает их заново
	 * (см. шапку). Признак переноса силами базы, который ещё держится в панели
	 * или над ней, — её увезли в той же задаче, подменю возвращается в панель
	 * меню, которую только что увезли, — колбэков этого переноса не глушит:
	 * иначе панель осталась бы у якоря, собранной для прежнего места.
	 */
	private _follow(): void {
		const anchor = this._anchor

		if (anchor === null) return

		this._forget(anchor)
		rebuild(this._nodes(), () => this._return(anchor))
	}

	/**
	 * Корни идут за местом — одним подключением: собираются они, когда возврат
	 * всех кончился (см. шапку).
	 */
	private static _followAll(teleports: readonly TTeleport[]): void {
		if (teleports.length === 0) return

		connecting(() => {
			for (const each of teleports) each._follow()
		})
	}

	/**
	 * Корень со спутником — к якорю, каждый одной операцией, якорь уходит;
	 * якорь без родителя — они просто уходят. Само по себе это настоящий
	 * перенос: корень идёт за местом (`_follow`). «На месте» (`_home`) зовёт его
	 * переносом силами базы.
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
