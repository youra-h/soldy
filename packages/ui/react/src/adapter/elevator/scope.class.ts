/**
 * TReactElevatorScope — лифт одной сборки компонента: родительский слой, своё и прочитанное.
 *
 * Заводится на каждую сборку заново (`useAdapterContext`): у пересобранного
 * компонента свои значения — например, новый движок коллекции.
 *
 * - `elevator` — фабрика лифтов, которую получает фабрика контекстов;
 * - `read` помнит, что сборка прочла: сменилось это в родительском слое —
 *   компонент собран на устаревшем и собирается заново (`isStale`);
 * - `write` копит своё, а `layerOver` кладёт его поверх родительского слоя —
 *   это слой, который компонент отдаёт детям.
 *
 * Читают и пишут лифт при сборке: своё, опущенное позже, в слой детей не
 * попадёт.
 */

import type { IElevatorKey, TElevatorFactory } from '@soldy-ui/setup'
import { TReactElevator } from './elevator.class'
import type { TElevatorLayer } from './layer'

export class TReactElevatorScope {
	private readonly _own = new Map<symbol, unknown>()
	private readonly _reads = new Map<symbol, unknown>()

	/** @param parent слой, который компонент увидел на рендере */
	constructor(readonly parent: TElevatorLayer) {}

	/** Лифты этой сборки: `up()` читает родительский слой, `down()` пишет в свой. */
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

	/** Сменилось ли в слое `layer` хоть что-то из прочитанного сборкой. */
	isStale(layer: TElevatorLayer): boolean {
		for (const [key, value] of this._reads) {
			if (layer.get(key) !== value) return true
		}

		return false
	}

	/**
	 * Слой для детей: `layer` родителя и своё поверх. Своего нет — тот же
	 * объект: детям не из-за чего перерисовываться.
	 */
	layerOver(layer: TElevatorLayer): TElevatorLayer {
		if (this._own.size === 0) return layer

		return new Map([...layer, ...this._own])
	}
}
