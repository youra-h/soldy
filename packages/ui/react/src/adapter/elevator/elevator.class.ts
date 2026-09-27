/**
 * TReactElevator — лифт одного ключа поверх слоя сборки (`TReactElevatorScope`).
 *
 * Наследует TElevator из @soldy-ui/setup: ключ лифта — символ, один на имя.
 *
 * В отличие от Vue (`provide`/`inject`), React-контекст не прокинуть
 * императивно, и хука в сборке может не быть: при повторной установке эффекта
 * компонент собирается заново вне рендера. Поэтому лифт не зовёт `useContext`
 * сам, а работает со слоем, который компонент увидел на рендере:
 *
 * - `up()` читает родительский слой;
 * - `down(value)` пишет в свой слой компонента — детям его отдаёт `Elevate`.
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
