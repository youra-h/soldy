import type { IStorage } from './types'

export class TArrayStorage<T> implements IStorage<T> {
	private _items: T[] = []

	get items(): readonly T[] {
		return this._items
	}

	insert(item: T, index: number): void {
		this._items.splice(index, 0, item)
	}

	remove(item: T): void {
		const idx = this._items.indexOf(item)

		if (idx !== -1) this._items.splice(idx, 1)
	}

	move(from: number, to: number): void {
		if (
			from === to ||
			from < 0 ||
			to < 0 ||
			from >= this._items.length ||
			to >= this._items.length
		)
			return

		const [item] = this._items.splice(from, 1)

		this._items.splice(to, 0, item)
	}

	clear(): void {
		this._items = []
	}
}
