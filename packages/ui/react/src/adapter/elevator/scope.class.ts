/**
 * TReactElevatorScope — лифт одной сборки: родительский слой, своё и
 * прочитанное. Сменилось прочитанное — сборка устарела (`isStale`).
 */

import type { IElevatorKey, TElevatorFactory } from '@soldy-ui/setup'
import { TReactElevator } from './elevator.class'
import type { TElevatorLayer } from './layer'

export class TReactElevatorScope {
	private readonly _own = new Map<symbol, unknown>()
	private readonly _reads = new Map<symbol, unknown>()

	/** @param parent слой, который компонент увидел на рендере */
	constructor(readonly parent: TElevatorLayer) {}

	readonly elevator: TElevatorFactory = <T>(key: IElevatorKey<T>) =>
		new TReactElevator<T>(key.name, this)

	read(key: symbol): unknown {
		const value = this.parent.get(key)

		this._reads.set(key, value)

		return value
	}

	write(key: symbol, value: unknown): void {
		this._own.set(key, value)
	}

	isStale(layer: TElevatorLayer): boolean {
		for (const [key, value] of this._reads) {
			if (layer.get(key) !== value) return true
		}

		return false
	}

	/** Слой для детей; своего нет — тот же объект, детям не из-за чего перерисовываться. */
	layerOver(layer: TElevatorLayer): TElevatorLayer {
		if (this._own.size === 0) return layer

		return new Map([...layer, ...this._own])
	}
}
