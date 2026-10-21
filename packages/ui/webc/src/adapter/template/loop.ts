/**
 * Петля по ключу — элементы коллекции из данных в шаблоне владельца: дети узла
 * по записям выборки (`shown`) или рисования (`drawn`), ключ — ключ записи, как
 * `v-for` с `:key` у Vue и `KeyedFor` у Solid.
 *
 * Записи новые на каждую смену, а элемент записи — тот же, пока жив её ключ:
 * петля, которая сверяла бы записи по ссылке, пересоздавала бы элементы вместе
 * с узлами, фокусом и сборкой.
 *
 * - Запись без элемента — новый элемент: его строит `create` владельца
 *   помощником `createItem` — без `embedded` (элементы своей коллекции
 *   признака не несут), но разметкой владельца: события элемента не
 *   всплывают. `ctrl` и копии образцов `item-*` ставятся до вставки.
 *   Вставка — его подключение: он собирается с инстансом данных и
 *   входит в коллекцию. Во время подключения владельца — следом за ним
 *   (ожидание, `waiting.ts`), и движок он уже находит.
 * - Запись с живым ключом отдаёт элементу то, что он берёт из записи, а не из
 *   своего инстанса (`update`): стиль распорки списка — высоту пропущенных и
 *   место — несёт запись, и с ключом он не сменится. Элемент коллекции берёт
 *   всё у своего инстанса, и `update` ему не нужен.
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

export class TKeyedLoop<TRecord, TKey, TElement extends Element = Element> {
	/** Нарисованные элементы по ключу — в порядке записей. */
	private _drawn = new Map<TKey, TElement>()

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

	/**
	 * Нарисованный элемент записи — по её ключу; не нарисован — `undefined`.
	 * Так шаблон отдаёт элементам то, что меняется мимо записей петли: набор
	 * ячеек строки таблицы сменился, а ячейки — нет.
	 */
	elementOf(record: TRecord): TElement | undefined {
		return this._drawn.get(this._keyOf(record))
	}

	/**
	 * Элементы — по записям: новым ключам — `create`, живым — их элементы, и
	 * запись им отдаёт `update` (см. шапку).
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

	/**
	 * Порядок DOM — порядок записей. Первое место — перед первым своим
	 * элементом, что уже стоит в узле, а нет таких — перед концом; дальше каждый
	 * встаёт сразу за предыдущим. Стоящий на месте не двигается.
	 */
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
