import { TSubscribable } from '../event/subscribable'
import type { TAttributesMap } from './types'

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
 * a listener given to `subscribe` is called on every real change, without
 * arguments. What to emit and whether with a snapshot is the owner's call: a
 * component emits `change:<set>` with the snapshot, while the two sets of a
 * date input part give one `change:segments` without it. A bus per set cost
 * every collection item four emitters, even an item that is never drawn.
 *
 * The storage map appears with the first entry: an empty set (`attrs` of a
 * list item, `headerAria` of a table row before mounting) holds no map.
 *
 * Subclasses add their own: `TDataset` — the prefix and type coercion, `TAria`
 * — exceptions like `role` and `tabindex` that belong to the set without
 * starting with `aria-`.
 */
export class TAttributes extends TSubscribable {
	/** Entries — from the first one. */
	protected _map?: Map<string, string>

	/**
	 * @param initial — the starting entries; `null` ones are skipped, and they
	 * are not a change
	 */
	constructor(initial?: TAttributesMap) {
		super()

		if (initial === undefined) return

		for (const [name, value] of Object.entries(initial)) {
			if (value === null) continue

			this._entries().set(this.resolve(name), value)
		}
	}

	/** The storage map, created by the first entry. */
	private _entries(): Map<string, string> {
		return (this._map ??= new Map())
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

		const key = this.resolve(name)

		if (this._map?.get(key) === value) return this

		this._entries().set(key, value)
		this._notify()

		return this
	}

	/** Removes an attribute. Reports the change if it was set. */
	remove(name: string): this {
		if (!this._map?.delete(this.resolve(name))) return this

		this._notify()

		return this
	}

	/** Значение атрибута или `undefined`. */
	get(name: string): string | undefined {
		return this._map?.get(this.resolve(name))
	}

	/** Стоит ли атрибут. */
	has(name: string): boolean {
		return this._map?.has(this.resolve(name)) ?? false
	}

	/** Имена всех выставленных атрибутов — уже канонические. */
	get names(): string[] {
		return this._map ? [...this._map.keys()] : []
	}

	/**
	 * Снимок набора — обычный объект для разметки.
	 *
	 * Новый объект на каждое чтение: за границу core → ui уходит значение, а
	 * не ссылка на состояние. Иначе потребитель мог бы незаметно его испортить.
	 */
	toObject(): TAttributesMap {
		return this._map ? Object.fromEntries(this._map) : {}
	}

	/** Тот же снимок. Вызывается адаптером автоматически при чтении пропа. */
	valueOf(): TAttributesMap {
		return this.toObject()
	}
}
