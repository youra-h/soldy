/**
 * TAngularElevator — лифт одного ключа поверх слоя DI (`TElevatorLayer`).
 *
 * Наследует TElevator из @soldy-ui/setup: ключ лифта — символ, один на имя.
 *
 * Передача от владельца к детям — через DI Angular, как `provide`/`inject` у
 * Vue: владелец подключает свой слой провайдером (`provideElevator()` в
 * `providers` декоратора), а лифт работает с ним в контексте инъекции
 * компонента — его даёт сборке база (`TComponentBase`, `runInInjectionContext`
 * в `ngOnInit`), и расширения сборки зовут лифт там же:
 *
 * - `down(value)` пишет в слой самого компонента (`self`). Слоя у компонента
 *   нет — это ошибка, а не запись в слой предка: значение ушло бы чужому
 *   поддереву, соседям владельца;
 * - `up()` читает слой над компонентом (`skipSelf`), как `inject` у Vue:
 *   своё опущенное компонент не видит. Слоя выше нет — значения нет.
 *
 * Значения в поле лифта нет: лифт создаётся на каждый вызов фабрики, а слой
 * у каждого владельца свой, поэтому соседние владельцы не видят движков друг
 * друга.
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
		// Тип значения задаёт ключ лифта: под этим ключом кладут только `T`
		return inject(ELEVATOR_LAYER, { skipSelf: true, optional: true })?.read(this._key) as
			| T
			| undefined
	}
}
