import type { IStorage } from './types'

export class TArrayStorage<TItem> implements IStorage<TItem> {
	private _items: TItem[] = []

	get items(): readonly TItem[] {
		return this._items
	}

	insert(item: TItem, index: number): void {
		this._items.splice(index, 0, item)
	}

	remove(item: TItem): void {
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
