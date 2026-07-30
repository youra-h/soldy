// types.ts — общие типы коллекции

export type TBaseCollectionEvent<T> =
    | { type: 'item:added'; item: T }
    | { type: 'item:removed'; item: T }
    | { type: 'item:updated'; item: T; changes: Partial<T> }
    | { type: 'item:moved'; item: T; oldIndex: number; newIndex: number }
    | { type: 'change:items'; items: readonly T[] };

export type TEngineEvents<T> = {
    [K in TBaseCollectionEvent<T>['type']]: (payload: Extract<TBaseCollectionEvent<T>, { type: K }>) => void;
};
