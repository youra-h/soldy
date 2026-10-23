/**
 * TReactElevator — лифт одного ключа поверх слоя сборки: `up()` читает
 * родительский слой, `down()` пишет в слой компонента. `useContext` лифт не
 * зовёт: сборка идёт и вне рендера. AGENTS.md (React), «Срок жизни
 * контекста».
 */

import { TElevator } from '@soldy-ui/setup'
import type { TReactElevatorScope } from './scope.class'

export class TReactElevator<T = unknown> extends TElevator<T> {
	constructor(
		key: string | symbol,
		private readonly _scope: TReactElevatorScope,
	) {
		super(key)
	}

	down(value: T): void {
		this._scope.write(this._key, value)
	}

	up(): T | undefined {
		// Тип значения задаёт ключ лифта: под этим ключом кладут только `T`
		return this._scope.read(this._key) as T | undefined
	}
}
