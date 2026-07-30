// storage/types.ts — интерфейс IStorage

export interface IStorage<T> {
    readonly items: readonly T[];
    insert(item: T, index: number): void;
    remove(item: T): void;
    move(from: number, to: number): void;
    clear(): void;
}
