/**
 * Контекст места — значение, привязанное к элементу, для всего, что стоит ниже
 * него по документу: у Custom Elements своего дерева нет, и провайдер отдаёт
 * значение элементу, а компонент синхронно ищет ближайшее вверх. AGENTS.md
 * (Web Components), «Контекст места».
 */
export class TPlaceContext<T> {
	/** Увезённый корень → якорь на его месте. Пишет телепорт до переноса. */
	private static readonly _anchors = new WeakMap<Node, Node>()

	static anchor(root: Node, anchor: Node): void {
		TPlaceContext._anchors.set(root, anchor)
	}

	static unanchor(root: Node): void {
		TPlaceContext._anchors.delete(root)
	}

	/** Узел на месте `node` в документе: у увезённого корня — его якорь. */
	static placeOf(node: Node): Node {
		return TPlaceContext._anchors.get(node) ?? node
	}

	/** Выше по месту: родитель, из теневого корня — хост, у увезённого корня — родитель якоря. */
	static above(node: Node): Node | null {
		const parent = TPlaceContext.placeOf(node).parentNode

		return parent instanceof ShadowRoot ? parent.host : parent
	}

	/** Узлы выше по месту, от ближайшего; сам узел не в счёт. */
	static *ancestors(node: Node): Generator<Node> {
		for (let place = TPlaceContext.above(node); place; place = TPlaceContext.above(place)) {
			yield place
		}
	}

	private readonly _values = new WeakMap<Element, T>()

	provide(element: Element, value: T): void {
		this._values.set(element, value)
	}

	/** Значение ближайшего места выше `node`; сам узел не в счёт. */
	nearest(node: Node): T | undefined {
		for (const place of TPlaceContext.ancestors(node)) {
			if (place instanceof Element && this._values.has(place)) return this._values.get(place)
		}

		return undefined
	}
}
