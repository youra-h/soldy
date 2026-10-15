/**
 * TSolidElevator — лифт одного ключа поверх слоёв сборки (`TElevatorLayer`).
 *
 * Наследует TElevator из @soldy-ui/setup: ключ лифта — символ, один на имя.
 *
 * Контекст Solid детям отдаёт только `Provider`, и императивно его не
 * выставить: своего владельца у компонента Solid в продакшене нет
 * (`createComponent` зовёт функцию компонента под владельцем родителя), и
 * значение, записанное в контекст `getOwner()`, увидели бы соседи владельца.
 * Поэтому лифт работает со слоями, которые сборка получила от `useElevator`:
 *
 * - `up()` читает слой предка — тот, что компонент увидел при сборке. Своё
 *   опущенное компонент не видит, как `inject` у Vue;
 * - `down(value)` пишет в слой компонента — детям его отдаёт `Elevate`.
 *
 * Значения в поле лифта нет: лифт создаётся на каждый вызов фабрики, а слой у
 * каждого владельца свой, поэтому соседние владельцы не видят движков друг
 * друга.
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
