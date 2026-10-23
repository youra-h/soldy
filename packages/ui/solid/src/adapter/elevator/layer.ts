/**
 * Слой лифта — значения владельца его поддереву, свои поверх слоя предка.
 * Контекст Solid один на все ключи, как у React и Angular. AGENTS.md (Solid), «Лифт».
 */

import { createContext } from 'solid-js'

export class TElevatorLayer {
	private readonly _own = new Map<symbol, unknown>()

	/** @param _parent слой ближайшего владельца выше; нет его — `undefined` */
	constructor(private readonly _parent: TElevatorLayer | undefined) {}

	/** Своё значение, а нет его — слоя предка. Опущенный `null` — тоже значение. */
	read(key: symbol): unknown {
		return this._own.has(key) ? this._own.get(key) : this._parent?.read(key)
	}

	write(key: symbol, value: unknown): void {
		this._own.set(key, value)
	}

	/** Своих значений нет: `Elevate` детям слой не отдаёт. */
	get empty(): boolean {
		return this._own.size === 0
	}
}

export const ElevatorContext = createContext<TElevatorLayer | undefined>(undefined)
