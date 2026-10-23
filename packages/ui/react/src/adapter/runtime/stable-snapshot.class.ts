/**
 * TStableSnapshot — снимок связки, где значение, не сменившееся по
 * содержимому, остаётся прежним объектом. AGENTS.md (React), «Связка и
 * состояние».
 */

import type { TStateSnapshot } from '@soldy-ui/setup'

function isPlain(value: unknown): value is object {
	if (typeof value !== 'object' || value === null) return false

	const proto: unknown = Object.getPrototypeOf(value)

	return proto === Object.prototype || proto === null
}

/** Простые объекты и массивы — вглубь, остальное — по идентичности. */
function sameContent(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) return true

	if (Array.isArray(a) && Array.isArray(b)) {
		return a.length === b.length && a.every((item, index) => sameContent(item, b[index]))
	}

	if (Array.isArray(a) || Array.isArray(b) || !isPlain(a) || !isPlain(b)) return false

	const keys = Object.keys(a)

	return (
		keys.length === Object.keys(b).length &&
		keys.every((key) => key in b && sameContent(Reflect.get(a, key), Reflect.get(b, key)))
	)
}

export class TStableSnapshot {
	/** Снимок связки, из которого собран `_snapshot`. */
	private _source: TStateSnapshot | null = null
	private _snapshot: TStateSnapshot | null = null

	constructor(private readonly _read: () => TStateSnapshot) {}

	readonly getSnapshot = (): TStateSnapshot => {
		const source = this._read()

		if (source === this._source && this._snapshot) return this._snapshot

		this._source = source
		this._snapshot = this._snapshot ? this._settle(this._snapshot, source) : source

		return this._snapshot
	}

	private _settle(previous: TStateSnapshot, next: TStateSnapshot): TStateSnapshot {
		let changed = false

		const entries = Object.entries(next).map(([name, value]): [string, unknown] => {
			const kept: unknown = previous[name]

			if (name in previous && sameContent(kept, value)) return [name, kept]

			changed = true

			return [name, value]
		})

		return changed ? Object.freeze(Object.fromEntries(entries)) : previous
	}
}
