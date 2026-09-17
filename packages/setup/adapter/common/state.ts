/**
 * toInstanceState — типизированный вид на состояние адаптера, одна граница на все адаптеры.
 */

import type { TInstanceState } from './state.types'

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
