/**
 * Петля по ключу — элементы коллекции из данных, как `v-for` с `:key`: записи
 * новые на каждую смену, а элемент записи тот же, пока жив её ключ. Элемент
 * не на своём месте едет переносом силами базы и не пересобирается. Свои
 * элементы петля держит подряд, перед `end` (нет его — в конце узла).
 */

import { relocate } from '../runtime/relocation'

export class TKeyedLoop<TRecord, TKey, TElement extends Element = Element> {
	private _drawn = new Map<TKey, TElement>()

	constructor(
		private readonly _parent: Node,
		private readonly _end: Node | null,
		private readonly _keyOf: (record: TRecord) => TKey,
	) {}

	elementOf(record: TRecord): TElement | undefined {
		return this._drawn.get(this._keyOf(record))
	}

	/**
	 * Новым ключам — `create`, живым — их элементы. `update` отдаёт то, что
	 * элемент берёт из записи, а не из инстанса: стиль распорки списка.
	 */
	draw(
		records: Iterable<TRecord>,
		create: (record: TRecord) => TElement,
		update?: (element: TElement, record: TRecord) => void,
	): void {
		const next = new Map<TKey, TElement>()

		for (const record of records) {
			const key = this._keyOf(record)

			if (next.has(key)) continue

			const drawn = this._drawn.get(key)

			if (drawn) update?.(drawn, record)

			next.set(key, drawn ?? create(record))
		}

		for (const [key, element] of this._drawn) {
			if (!next.has(key)) element.remove()
		}

		this._drawn = next
		this._order([...next.values()])
	}

	/** Первое место — перед первым своим элементом в узле; стоящий на месте не двигается. */
	private _order(elements: readonly TElement[]): void {
		const parent = this._parent
		const own = new Set<Node>(elements)
		let place: Node | null = this._end

		for (let node = parent.firstChild; node && node !== this._end; node = node.nextSibling) {
			if (own.has(node)) {
				place = node
				break
			}
		}

		for (const element of elements) {
			if (element === place) {
				place = element.nextSibling

				continue
			}

			if (element.parentNode === parent) {
				relocate([element], () => parent.insertBefore(element, place))
			} else {
				parent.insertBefore(element, place)
			}
		}
	}
}
