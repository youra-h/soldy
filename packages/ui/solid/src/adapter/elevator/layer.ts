/**
 * Слой лифта — значения, которые владелец отдаёт своему поддереву: свои поверх
 * слоя предка.
 *
 * Контекст Solid один на все ключи, как у React
 * (`ui/react/src/adapter/elevator/layer.ts`) и Angular
 * (`ui/angular/src/adapter/elevator/layer.ts`), а ключи живут в слое: значение
 * контекста Solid отдаёт детям только `Provider`, и контекст на ключ пришлось
 * бы заводить заранее, по всем ключам, которые опустит сборка. Владелец
 * оборачивает своё содержимое `Elevate` — детям уходит его слой, а сборка
 * пишет в него и читает из слоя предка (`useElevator`).
 *
 * Слой — как у Angular, а не неизменяемая карта React: сборка у компонента
 * Solid одна, и следить, сменилось ли прочитанное, незачем.
 *
 * - `write` — в свой слой, своё перекрывает слой предка;
 * - `read` — ключ своего слоя, а нет его — у предка, и так до корня.
 *   Опущенный `null` — тоже значение: им `TVirtualCollectionExtension`
 *   отрезает окно обёртки `Virtual` от списков в слотах своих элементов, и
 *   слой предка за ним уже не читается.
 *
 * Контекст наружу не выходит: читают его `useElevator` и `Elevate`.
 */

import { createContext } from 'solid-js'

export class TElevatorLayer {
	private readonly _own = new Map<symbol, unknown>()

	/** @param _parent слой ближайшего владельца выше; нет его — `undefined` */
	constructor(private readonly _parent: TElevatorLayer | undefined) {}

	/** Значение ключа: своё, а нет его — слоя предка. */
	read(key: symbol): unknown {
		return this._own.has(key) ? this._own.get(key) : this._parent?.read(key)
	}

	/** Своё значение ключа — поверх слоя предка. */
	write(key: symbol, value: unknown): void {
		this._own.set(key, value)
	}
}

/** Слой ближайшего владельца выше; вне владельцев — `undefined`. */
export const ElevatorContext = createContext<TElevatorLayer | undefined>(undefined)
