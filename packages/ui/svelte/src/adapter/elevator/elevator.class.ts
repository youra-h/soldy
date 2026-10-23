/**
 * Лифт одного ключа поверх контекста Svelte. `up()` отдаёт значение предка и
 * после своего `down()` того же ключа: его до первой записи помнит слой
 * сборки — общий для лифтов одной `useElevator()`. AGENTS.md (Svelte),
 * «Контекст: лифт и локаль».
 */

import { getContext, setContext } from 'svelte'
import { TElevator } from '@soldy-ui/setup'

export class TSvelteElevator<T = any> extends TElevator<T> {
	constructor(
		key: string | symbol,
		private readonly _inherited: Map<symbol, unknown>,
	) {
		super(key)
	}

	down(value: T): void {
		if (!this._inherited.has(this._key)) {
			this._inherited.set(this._key, getContext(this._key))
		}

		setContext(this._key, value)
	}

	up(): T | undefined {
		if (!this._inherited.has(this._key)) return getContext<T | undefined>(this._key)

		// Тип значения задаёт ключ лифта: под этим ключом кладут только `T`
		return this._inherited.get(this._key) as T | undefined
	}
}
