export interface IStorage<TItem> {
	readonly items: readonly TItem[]

	insert(item: TItem, index: number): void
	remove(item: TItem): void
	move(from: number, to: number): void
	clear(): void
}
