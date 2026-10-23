/**
 * Лифт одного ключа поверх слоёв сборки: `up()` читает слой предка, `down()`
 * пишет в слой компонента. AGENTS.md (Solid), «Лифт».
 */

import { TElevator } from '@soldy-ui/setup'
import type { TElevatorLayer } from './layer'

export class TSolidElevator<T = unknown> extends TElevator<T> {
	/**
	 * @param _parent слой предка; вне владельцев — `undefined`
	 * @param _own слой компонента
	 */
	constructor(
		key: string | symbol,
		private readonly _parent: TElevatorLayer | undefined,
		private readonly _own: TElevatorLayer,
	) {
		super(key)
	}

	down(value: T): void {
		this._own.write(this._key, value)
	}

	up(): T | undefined {
		// Тип значения задаёт ключ лифта: под этим ключом кладут только `T`
		return this._parent?.read(this._key) as T | undefined
	}
}
