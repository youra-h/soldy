// storage/types.ts — интерфейс IStorage

export interface IStorage<T> {
    readonly items: readonly T[];
    add(item: T): void;
    remove(item: T): void;
    move(from: number, to: number): void;
    clear(): void;
}
