/**
 * Отсрочка: первая сборка разметки, которой собираться рано, идёт позже и по
 * месту — элемент не раньше того, кто ждёт над ним, соседи в порядке
 * документа, теневое дерево хоста раньше его света. AGENTS.md (Web
 * Components), «Отсрочка первой сборки».
 */

import { TPlaceContext } from '../context'
import { runAll } from './waiting'

type TDeferred = {
	readonly element: Element
	readonly resume: () => void
}

type TPlaced = {
	readonly deferred: TDeferred
	readonly path: readonly Node[]
}

/** Путь места — от корня дерева до самого узла. */
function pathOf(node: Node): Node[] {
	return [...TPlaceContext.ancestors(node)].reverse().concat(node)
}

/**
 * Два узла под общим местом: рядом — порядок документа; один в теневом дереве
 * общего хоста, другой в его свете — теневое раньше. Голый
 * `compareDocumentPosition` через теневую границу порядка не обещает.
 */
function siblingOrder(a: Node, b: Node): number {
	const placeA = TPlaceContext.placeOf(a)
	const placeB = TPlaceContext.placeOf(b)

	if (placeA.parentNode === placeB.parentNode) {
		return placeA.compareDocumentPosition(placeB) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
	}

	return placeA.parentNode instanceof ShadowRoot ? -1 : 1
}

function compare(a: readonly Node[], b: readonly Node[]): number {
	const length = Math.min(a.length, b.length)

	for (let index = 1; index < length; index += 1) {
		if (a[index] !== b[index]) return siblingOrder(a[index], b[index])
	}

	return a.length - b.length
}

/**
 * Раунд по месту. Деревьев больше одного, только если элемент сняли до его
 * раунда: такие идут в порядке прихода первого из каждого.
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

export class TDeferral {
	private static readonly _waiting = new Map<Node, TDeferral>()
	private static readonly _parsing = new WeakMap<Document, TDeferral>()

	/** Разметка, ожившая при регистрации; собирает её `defineElement`, когда оживлять некого. */
	static readonly registration = new TDeferral()

	/** Очередь документа, пока он разбирается: собирается на `DOMContentLoaded`. */
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

	/** Очередь элемента, который ждёт выше `node` по месту. */
	static above(node: Node): TDeferral | undefined {
		if (TDeferral._waiting.size === 0) return undefined

		for (const place of TPlaceContext.ancestors(node)) {
			const deferral = TDeferral._waiting.get(place)

			if (deferral !== undefined) return deferral
		}

		return undefined
	}

	private _deferred: TDeferred[] = []

	defer(element: Element, resume: () => void): void {
		TDeferral._waiting.set(element, this)
		this._deferred.push({ element, resume })
	}

	/** Раундами: порядок раунда считается в его начале, пришедшее во время — следующим. */
	release(): void {
		runAll(this._rounds())
	}

	private *_rounds(): Generator<() => void> {
		for (let round = this._take(); round.length > 0; round = this._take()) {
			for (const { element, resume } of round) {
				yield () => {
					TDeferral._waiting.delete(element)
					resume()
				}
			}
		}
	}

	private _take(): TDeferred[] {
		const deferred = this._deferred

		this._deferred = []

		return byPlace(deferred)
	}
}
