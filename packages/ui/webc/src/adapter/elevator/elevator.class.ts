/**
 * TWebcElevator — лифт одного ключа на контексте места (`TPlaceContext`).
 *
 * Наследует TElevator из @soldy-ui/setup: ключ лифта — символ, один на имя.
 *
 * У остальных адаптеров лифт стоит на механизме фреймворка — `provide`/
 * `inject`, Context, `setContext`, DI. Своего дерева у Custom Elements нет, а
 * дерево документа есть, и место элемента в нём известно, пока он подключён,
 * — на этом же стоит локаль поддерева (`locale/context.ts`). Поэтому лифт знает
 * свой элемент — он и есть место:
 *
 * - `down(value)` отдаёт значение хосту: его видит всё, что стоит в документе
 *   ниже него. Владелец коллекции опускает движок и регистратор при сборке, и
 *   их находят и элементы разметки — его свет, — и элементы из данных в его
 *   шаблоне, а соседям и предкам владельца их не видно;
 * - `up()` ищет ближайшее значение выше хоста, сам хост не в счёт, как
 *   `inject` у Vue: своё опущенное элемент не видит. Выше значения нет —
 *   `undefined`. Опущенный `null` — тоже значение: слой выше за ним не
 *   читается.
 *
 * Связка у элемента новая на каждое подключение, и сборка опускает значение
 * заново: владелец, переставленный в документе, опускает свежий движок, а
 * элементы в нём, собираясь следом, берут уже его. Элемент, переставленный к
 * другому владельцу, находит при сборке нового — поиск идёт от места, а не от
 * того, где элемент собрался впервые.
 *
 * Место значения — по `TPlaceContext`: от корня, увезённого телепортом, поиск
 * идёт к родителю его якоря, а из теневого корня — к его хосту.
 */

import { TElevator } from '@soldy-ui/setup'
import { TPlaceContext } from '../context'

/**
 * Контекст места на каждый ключ лифта: значение под ключом держит только он.
 * Тип значения у ключа один (`IElevatorKey<T>`), а карта ключей общая, и тип
 * значения в ней стёрт — как `TCollectionEngine<any, any>` у опции `engine`.
 */
const PLACES = new Map<symbol, TPlaceContext<any>>()

/** Контекст места ключа: создаётся с первым обращением и живёт с ключом. */
function placeOf<T>(key: symbol): TPlaceContext<T> {
	let place = PLACES.get(key)

	if (!place) {
		place = new TPlaceContext<T>()
		PLACES.set(key, place)
	}

	return place
}

export class TWebcElevator<T = unknown> extends TElevator<T> {
	/**
	 * @param key имя ключа лифта (`IElevatorKey.name`)
	 * @param _host элемент, чья сборка зовёт лифт, — место значения
	 */
	constructor(
		key: string | symbol,
		private readonly _host: Element,
	) {
		super(key)
	}

	down(value: T): void {
		placeOf<T>(this._key).provide(this._host, value)
	}

	up(): T | undefined {
		return placeOf<T>(this._key).nearest(this._host)
	}
}
