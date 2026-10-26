import { TSubscribable } from '../event/subscribable'
import type { TAttributesMap } from './types'

/**
 * The name slot of `name` among `entries` — `[name, value, name, value, …]`,
 * or `-1`. Only the name slots: `indexOf` would find a value equal to the name
 * too.
 */
function indexOfName(entries: readonly string[], name: string): number {
	for (let index = 0; index < entries.length; index += 2) {
		if (entries[index] === name) return index
	}

	return -1
}

/**
 * A live set of attributes, `name → value`.
 *
 * The base of `TAria` and `TDataset`. They share more than the storage: the
 * meaning of `null` (remove the attribute), the rule "report only a real
 * change" and, above all, the snapshot through `valueOf()`.
 *
 * The snapshot is not a convenience but the core → ui boundary contract: the
 * adapter detects a change by a new value identity, so a new object has to
 * cross the boundary, not a reference to the state. Duplicate this mechanism
 * in a second class, and one day one of the two sets silently stops reaching
 * the markup.
 *
 * It stores values, not functions. There are no computed entries on purpose:
 * their freshness would depend on someone remembering to list the sources in
 * the prop triggers. Here the trigger is single and fires exactly when the set
 * has really changed.
 *
 * **The set reports a change, it has no bus of its own** (`TSubscribable`):
 * a listener given to `subscribe` is called on every real change and receives
 * the set. What to emit and whether with a snapshot is the owner's call: a
 * component emits `change:<set>` with the snapshot, while the two sets of a
 * date input part give one `change:segments` without it. A bus per set cost
 * every collection item four emitters, even an item that is never drawn.
 *
 * **The entries are a flat array, not a `Map`**: `[name, value, name, value,
 * …]`, of exact length. A map gets its hash table with the first entry, with
 * room for four entries and their buckets, and an item of a collection holds
 * two or three sets of two to four entries each; an array costs a slot per
 * name and per value. The search is linear: on the few entries of a set it is
 * cheaper than hashing, and a set does not hold more. The array appears with
 * the first entry and goes with the last one: an empty set (`attrs` of a list
 * item, `headerAria` of a table row before mounting) holds no array.
 *
 * Subclasses add their own: `TDataset` — the prefix and type coercion, `TAria`
 * — exceptions like `role` and `tabindex` that belong to the set without
 * starting with `aria-`.
 */
export class TAttributes extends TSubscribable {
	/**
	 * Entries — a name in an even slot, its value in the next one; from the
	 * first entry, one per canonical name, in the order the names were added.
	 */
	private _entries?: string[]

	/**
	 * @param initial — the starting entries; `null` ones are skipped, and they
	 * are not a change. Two names with one canonical form give one entry, the
	 * last value wins
	 */
	constructor(initial?: TAttributesMap) {
		super()

		if (initial === undefined) return

		for (const [name, value] of Object.entries(initial)) {
			if (value !== null) this._write(this.resolve(name), value)
		}
	}

	/**
	 * Writes an entry under the canonical name `key`; `true` if the set has
	 * changed.
	 *
	 * A new value goes in place, and the entry keeps its position. A new name
	 * builds a new array one entry longer: `concat` allocates exactly the
	 * result, while an array grown by an element (`push`, `splice`, a spread
	 * with an element in the tail) keeps room to grow, as the listeners of a
	 * bus do (`listen` in `evented.ts`).
	 */
	private _write(key: string, value: string): boolean {
		const entries = this._entries

		if (entries === undefined) {
			this._entries = [key, value]

			return true
		}

		const index = indexOfName(entries, key)

		if (index === -1) {
			this._entries = entries.concat(key, value)

			return true
		}

		if (entries[index + 1] === value) return false

		entries[index + 1] = value

		return true
	}

	/**
	 * Приводит имя к каноническому виду. База не меняет ничего; `TData`
	 * подставляет здесь префикс `data-`.
	 */
	protected resolve(name: string): string {
		return name
	}

	/**
	 * Sets an attribute. `null` and `undefined` remove it — so one can write
	 * `add('aria-disabled', disabled ? 'true' : null)` instead of branching on
	 * every call.
	 *
	 * Reports the change only if the set has really changed.
	 */
	add(name: string, value: string | null | undefined): this {
		if (value === null || value === undefined) return this.remove(name)

		if (this._write(this.resolve(name), value)) this._notify()

		return this
	}

	/**
	 * Removes an attribute. Reports the change if it was set.
	 *
	 * The entries are rebuilt without it, of exact length, as `_write` builds
	 * them with a new name; without the last entry there is no array.
	 */
	remove(name: string): this {
		const entries = this._entries

		if (entries === undefined) return this

		const index = indexOfName(entries, this.resolve(name))

		if (index === -1) return this

		this._entries =
			entries.length === 2
				? undefined
				: entries.slice(0, index).concat(entries.slice(index + 2))
		this._notify()

		return this
	}

	/** The value of the attribute, or `undefined`. */
	get(name: string): string | undefined {
		const entries = this._entries

		if (entries === undefined) return undefined

		const index = indexOfName(entries, this.resolve(name))

		return index === -1 ? undefined : entries[index + 1]
	}

	/** Whether the attribute is set. */
	has(name: string): boolean {
		const entries = this._entries

		return entries !== undefined && indexOfName(entries, this.resolve(name)) !== -1
	}

	/** The names of all set attributes, already canonical, in the order they were added. */
	get names(): string[] {
		return this._entries?.filter((_, index) => index % 2 === 0) ?? []
	}

	/**
	 * The snapshot of the set — a plain object for the markup.
	 *
	 * A new object on every read: a value crosses the core → ui boundary, not a
	 * reference to the state. Otherwise a consumer could quietly corrupt it.
	 */
	toObject(): TAttributesMap {
		const snapshot: TAttributesMap = {}
		const entries = this._entries

		if (entries === undefined) return snapshot

		for (let index = 0; index < entries.length; index += 2) {
			snapshot[entries[index]] = entries[index + 1]
		}

		return snapshot
	}

	/** Тот же снимок. Вызывается адаптером автоматически при чтении пропа. */
	valueOf(): TAttributesMap {
		return this.toObject()
	}
}
