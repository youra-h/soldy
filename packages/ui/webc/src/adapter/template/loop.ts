/**
 * Петля по ключу — элементы коллекции из данных в шаблоне владельца: дети узла
 * по записям выборки (`shown`), ключ — `uid` элемента, как `v-for` с `:key` у
 * Vue и `KeyedFor` у Solid.
 *
 * Записи выборки новые на каждую смену, а элемент записи — тот же, пока жив её
 * ключ: петля, которая сверяла бы записи по ссылке, пересоздавала бы элементы
 * вместе с узлами, фокусом и сборкой.
 *
 * - Запись без элемента — новый элемент: его строит `create` владельца —
 *   `createElement(tag, { is })`, без `embedded` (элементы своей коллекции
 *   признака не несут), а `ctrl` и копии образцов `item-*` ставятся до
 *   вставки. Вставка — его подключение: он собирается с инстансом данных и
 *   входит в коллекцию. Во время подключения владельца — следом за ним
 *   (ожидание, `waiting.ts`), и движок он уже находит.
 * - Элемент без записи снимается: его монтирование кончилось, а сам элемент
 *   данных остаётся в коллекции (фильтр, страница).
 * - Порядок DOM — порядок записей. Элемент, который стоит не на своём месте,
 *   едет переносом силами базы (`relocate`): одной операцией, и связку перенос
 *   не трогает. Новые встают по порядку записей, и собираются в нём же.
 *
 * Свои элементы петля держит в одном месте узла: подряд, перед концом
 * (`end` — следующий за ними узел шаблона; нет его — в конце узла).
 */

import { relocate } from '../runtime/relocation'

export class TKeyedLoop<TRecord, TKey> {
	/** Нарисованные элементы по ключу — в порядке записей. */
	private _drawn = new Map<TKey, Element>()

	/**
	 * @param _parent узел, в котором стоят элементы
	 * @param _end узел шаблона сразу за элементами; `null` — элементы в конце узла
	 * @param _keyOf ключ записи
	 */
	constructor(
		private readonly _parent: Node,
		private readonly _end: Node | null,
		private readonly _keyOf: (record: TRecord) => TKey,
	) {}

	/** Элементы — по записям: живым ключам — их элементы, новым — `create`. */
	draw(records: Iterable<TRecord>, create: (record: TRecord) => Element): void {
		const next = new Map<TKey, Element>()

		for (const record of records) {
			const key = this._keyOf(record)

			if (!next.has(key)) next.set(key, this._drawn.get(key) ?? create(record))
		}

		for (const [key, element] of this._drawn) {
			if (!next.has(key)) element.remove()
		}

		this._drawn = next
		this._order([...next.values()])
	}

	/**
	 * Порядок DOM — порядок записей. Первое место — перед первым своим
	 * элементом, что уже стоит в узле, а нет таких — перед концом; дальше каждый
	 * встаёт сразу за предыдущим. Стоящий на месте не двигается.
	 */
	private _order(elements: readonly Element[]): void {
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
