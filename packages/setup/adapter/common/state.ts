/**
 * toInstanceState — типизированный вид на состояние адаптера, одна граница на все адаптеры.
 */

import type { IComponentContract } from '../../define'
import type { TAdapterState } from './state.types'

/**
 * Типизированный вид на состояние адаптера.
 *
 * Граница между рантаймом и типом, одна на все адаптеры. Объект собран по
 * дескриптору из того же инстанса и тех же плагинов, что описывает контракт
 * `C`, но по именам свойств — эту связь держит дескриптор, TypeScript её не
 * видит (так же, как `get`/`set` в декларации пропа).
 */
export function toInstanceState<C extends IComponentContract>(
	state: Readonly<Record<string, unknown>>,
): TAdapterState<C> {
	return state as TAdapterState<C>
}
