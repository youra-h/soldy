/**
 * Лифт одного ключа поверх слоя DI (`provideElevator()` владельца), как
 * `provide`/`inject` у Vue. Зовётся в контексте инъекции, который даёт сборке
 * база. AGENTS.md (Angular), «Лифт — слой DI на владельца».
 *
 * - `down` пишет в свой слой; слоя нет — ошибка: значение ушло бы соседям;
 * - `up` читает слой над компонентом;
 * - `upLater` — слой сейчас, значение при вызове (API тостов: компонент в
 *   `<div so-toasts>` создаётся раньше, чем менеджер опускает API).
 */

import { inject } from '@angular/core'
import { TElevator } from '@soldy-ui/setup'
import { ELEVATOR_LAYER } from './layer'

export class TAngularElevator<T = unknown> extends TElevator<T> {
	down(value: T): void {
		const layer = inject(ELEVATOR_LAYER, { self: true, optional: true })

		if (!layer) {
			throw new Error(
				`Лифт «${this._key.description}»: у компонента нет своего слоя — владелец подключает его провайдером provideElevator()`,
			)
		}

		layer.write(this._key, value)
	}

	up(): T | undefined {
		return this.upLater()()
	}

	upLater(): () => T | undefined {
		const layer = inject(ELEVATOR_LAYER, { skipSelf: true, optional: true })
		const key = this._key

		// Тип значения задаёт ключ лифта: под ним кладут только `T`
		return () => layer?.read(key) as T | undefined
	}
}
