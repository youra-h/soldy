// types.ts — словарь событий коллекции

export type TEngineEvents<T> = {
    /** Вызывается при добавлении элемента */
    'item:added': (item: T) => void

    /** Вызывается при удалении элемента */
    'item:removed': (item: T) => void

    /** Вызывается при изменении элемента */
    'item:updated': (item: T, changes: Partial<T>) => void

    /** Вызывается при перемещении элемента */
    'item:moved': (item: T, oldIndex: number, newIndex: number) => void

    /** Массовые или системные изменения массива элементов */
    'change:items': (items: readonly T[]) => void

    /** Изменение количества элементов */
    'change:count': (count: number) => void

    /** Полный сброс или очистка коллекции */
    'reset': () => void
}
