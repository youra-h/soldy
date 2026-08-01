// types.ts — словарь событий движка коллекции

export type TEngineEvents<T> = {
    /** Вызывается при добавлении одного элемента */
    'item:added': (item: T) => void

    /** Вызывается при удалении одного элемента */
    'item:removed': (item: T) => void

    /** Вызывается при изменении элемента */
    'item:updated': (item: T, changes: Partial<T>) => void

    /** Вызывается при перемещении элемента */
    'item:moved': (item: T, oldIndex: number, newIndex: number) => void

    /** Системные изменения массива элементов */
    'change:items': (items: readonly T[]) => void

    /** Изменение количества элементов */
    'change:count': (count: number) => void

    /** Полный сброс или очистка коллекции */
    'reset': () => void
}
