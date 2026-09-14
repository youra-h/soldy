/**
 * Значение свойства инстанса так, как его видит разметка.
 *
 * Составной объект со своим `valueOf()` отдаёт снимок (`TClasses` → `string[]`,
 * `TAria` → набор атрибутов) — ровно так значение читает `TAccessor.getValue`.
 * У объекта без своего `valueOf` (унаследованный вернул бы сам объект) снимка
 * нет, остаётся тип свойства. Примитивы не трогаются, чтобы не расширять
 * литеральные типы вроде `'ltr' | 'rtl'`.
 */
export type TSnapshotOf<T> = T extends object
	? T extends { valueOf(): infer TValue }
		? [T] extends [TValue]
			? T
			: TValue
		: T
	: T

/**
 * Состояние адаптера, как его читает разметка: свойства инстанса после
 * `valueOf()`.
 *
 * Все ключи необязательны: состояние собирается по дескриптору и содержит только
 * свойства с триггерами.
 */
export type TInstanceState<TInstance> = {
	readonly [K in keyof TInstance]?: TSnapshotOf<TInstance[K]>
}

/**
 * Типизированный вид на состояние адаптера.
 *
 * Граница между рантаймом и типом, одна на все адаптеры. Объект собран по
 * дескриптору из того же инстанса, что описывает `TInstance`, но по именам
 * свойств — эту связь держит дескриптор, TypeScript её не видит (так же, как
 * `get`/`set` в декларации пропа).
 */
export function toInstanceState<TInstance>(
	state: Readonly<Record<string, unknown>>,
): TInstanceState<TInstance> {
	return state as TInstanceState<TInstance>
}
