/**
 * Отсрочка — первая сборка разметки, которой собираться рано, идёт позже и по
 * месту.
 *
 * Первая сборка элемента soldy — при подключении (`ElementBase`): `el.ctrl`
 * есть сразу после вставки, на это опираются приложения. Разметке страницы
 * собираться при подключении рано, и база отдаёт её очереди — одной из двух, у
 * каждой свой момент:
 *
 * - очередь документа, пока он разбирается, — на его `DOMContentLoaded`:
 *   элемент, определённый до разметки (скрипт в `<head>`), парсер подключает
 *   раньше, чем дописал его детей, и свет был бы пуст. Сюда же встаёт разметка,
 *   ожившая при регистрации до конца разбора (классический скрипт в конце
 *   `body`);
 * - очередь регистрации — разметка, ожившая при регистрации (`defineElement`):
 *   браузер оживляет её внутри `customElements.define`, ещё при импорте
 *   пакета, раньше строк точки входа, где приложение подключает тему, иконки и
 *   свои плагины. Собирает очередь сама регистрация, когда оживлять больше
 *   некого: сразу после синхронной части, а с полифилом — после его микрозадач
 *   оживления.
 *
 * Очередь собирает по месту — тем же путём, каким ищет контекст места
 * (`TPlaceContext.above`): родитель, из теневого корня — хост, у увезённого
 * корня — якорь. Элемент не собирается раньше элемента, который стоит над ним
 * по месту и ждёт в очереди, а соседи собираются в порядке документа; теневое
 * дерево хоста — раньше его света, как в порядке дерева вместе с теневыми
 * (shadow-including tree order). Так владелец коллекции успевает опустить
 * движок, группа — свой ключ, подменю — свой движок, и элементы входят в
 * коллекцию в порядке документа, в каком бы порядке ни регистрировались их
 * виды: браузер оживляет разметку имя за именем. Голый `compareDocumentPosition`
 * не годится: через теневую границу он даёт порядок «как реализовано», а
 * элемент в панели Frame, увезённой в цель выше владельца, обогнал бы
 * владельца.
 *
 * Первое подключение под элементом, который ждёт в очереди, встаёт в его
 * очередь (`TDeferral.above`). Элемент, который код вставил в ждущую разметку,
 * иначе собрался бы раньше её владельца — мимо коллекции, — а с полифилом так
 * же собиралась бы разметка в теневом корне под ждущим владельцем: снимок
 * регистрации теневых корней не видит. Под владельцем, которого полифил ещё
 * не оживил, такая разметка встаёт в очередь регистрации
 * (`isUnderUpgrade`, `defineElement.ts`).
 *
 * Очередь собирается раундами: порядок раунда считается, когда он начался, а
 * что пришло во время сборки, идёт следующим раундом. Сборка, упавшая с
 * ошибкой, остальных не держит, а первая ошибка уходит дальше — к тому, кто
 * очередь собирал, — как в ожидании (`waiting.ts`). Что делать в свой раунд,
 * элемент решает сам (`_resume` базы): снятый к этому времени не собирается.
 *
 * В бочку адаптера не входит: это механика базы.
 */

import { TPlaceContext } from '../context'

/** Отложенная сборка: элемент и то, что его соберёт. */
type TDeferred = {
	readonly element: Element
	readonly resume: () => void
}

/** Отложенная сборка и путь места её элемента — по нему раунд встаёт по порядку. */
type TPlaced = {
	readonly deferred: TDeferred
	readonly path: readonly Node[]
}

/** Путь места — от корня дерева до самого узла (см. шапку). */
function pathOf(node: Node): Node[] {
	const path: Node[] = []

	for (let place: Node | null = node; place !== null; place = TPlaceContext.above(place)) {
		path.push(place)
	}

	return path.reverse()
}

/**
 * Порядок двух узлов с общим местом выше — по месту каждого в документе:
 * стоят рядом — порядок документа, а из двух, где один в теневом дереве
 * общего хоста, а другой в его свете, — теневое дерево раньше.
 */
function siblingOrder(a: Node, b: Node): number {
	const placeA = TPlaceContext.placeOf(a)
	const placeB = TPlaceContext.placeOf(b)

	if (placeA.parentNode === placeB.parentNode) {
		return placeA.compareDocumentPosition(placeB) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
	}

	return placeA.parentNode instanceof ShadowRoot ? -1 : 1
}

/** Порядок двух путей одного дерева: выше по месту — раньше, соседи — по месту. */
function compare(a: readonly Node[], b: readonly Node[]): number {
	const length = Math.min(a.length, b.length)

	for (let index = 1; index < length; index += 1) {
		if (a[index] !== b[index]) return siblingOrder(a[index], b[index])
	}

	return a.length - b.length
}

/**
 * Раунд по месту. Деревьев больше одного, только если элемент сняли до его
 * раунда: путь такого кончается в снятом поддереве, и с остальными его не
 * сравнить, — деревья идут в порядке прихода первого из каждого.
 */
function byPlace(deferred: readonly TDeferred[]): TDeferred[] {
	const trees = new Map<Node, TPlaced[]>()

	for (const each of deferred) {
		const path = pathOf(each.element)
		const tree = trees.get(path[0])

		if (tree) {
			tree.push({ deferred: each, path })
		} else {
			trees.set(path[0], [{ deferred: each, path }])
		}
	}

	return [...trees.values()].flatMap((tree) =>
		tree.sort((a, b) => compare(a.path, b.path)).map((placed) => placed.deferred),
	)
}

/** Очередь отсрочки — см. шапку. */
export class TDeferral {
	/** Элементы, которые ждут в очереди, — каждый со своей очередью. */
	private static readonly _waiting = new Map<Node, TDeferral>()

	/** Очереди документов, которые ещё разбираются. */
	private static readonly _parsing = new WeakMap<Document, TDeferral>()

	/**
	 * Очередь регистрации — разметка, ожившая при регистрации. Собирает её
	 * регистрация (`defineElement`), когда оживлять больше некого.
	 */
	static readonly registration = new TDeferral()

	/**
	 * Очередь документа, пока он разбирается: собирается на его
	 * `DOMContentLoaded`. Документ, который разбирается снова, получит новую.
	 */
	static parsing(owner: Document): TDeferral {
		const ready = TDeferral._parsing.get(owner)

		if (ready !== undefined) return ready

		const deferral = new TDeferral()

		TDeferral._parsing.set(owner, deferral)
		owner.addEventListener(
			'DOMContentLoaded',
			() => {
				TDeferral._parsing.delete(owner)
				deferral.release()
			},
			{ once: true },
		)

		return deferral
	}

	/**
	 * Очередь элемента, который ждёт выше `node` по месту, — сам узел не в
	 * счёт. Выше никто не ждёт — `undefined`.
	 */
	static above(node: Node): TDeferral | undefined {
		if (TDeferral._waiting.size === 0) return undefined

		for (
			let place = TPlaceContext.above(node);
			place !== null;
			place = TPlaceContext.above(place)
		) {
			const deferral = TDeferral._waiting.get(place)

			if (deferral !== undefined) return deferral
		}

		return undefined
	}

	/** Сборки, которые ждут следующего раунда, — в порядке прихода. */
	private _deferred: TDeferred[] = []

	/** Отложить сборку элемента: `resume` позовут в его раунд. */
	defer(element: Element, resume: () => void): void {
		TDeferral._waiting.set(element, this)
		this._deferred.push({ element, resume })
	}

	/** Собрать очередь — раундами, каждый по месту (см. шапку). */
	release(): void {
		let failed = false
		let failure: unknown

		for (let round = this._take(); round.length > 0; round = this._take()) {
			for (const { element, resume } of round) {
				TDeferral._waiting.delete(element)

				try {
					resume()
				} catch (error) {
					if (!failed) {
						failed = true
						failure = error
					}
				}
			}
		}

		if (failed) throw failure
	}

	/** Следующий раунд — пришедшие к этому времени, по месту. */
	private _take(): TDeferred[] {
		const deferred = this._deferred

		this._deferred = []

		return byPlace(deferred)
	}
}
