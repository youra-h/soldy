/**
 * Лифт одного ключа на контексте места: `down` отдаёт значение хосту — его
 * видит всё ниже по документу, `up` ищет ближайшее выше, сам хост не в счёт,
 * как `inject` у Vue. Связка новая на каждое подключение, и переставленный
 * элемент находит нового владельца.
 */

import { TElevator } from '@soldy-ui/setup'
import { TPlaceContext } from '../context'

/** Тип значения у ключа один, а карта общая — в ней он стёрт. */
const PLACES = new Map<symbol, TPlaceContext<any>>()

function placeOf<T>(key: symbol): TPlaceContext<T> {
	let place = PLACES.get(key)

	if (!place) {
		place = new TPlaceContext<T>()
		PLACES.set(key, place)
	}

	return place
}

export class TWebcElevator<T = unknown> extends TElevator<T> {
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
