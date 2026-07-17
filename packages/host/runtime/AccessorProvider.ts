/**
 * @soldy/host — runtime/RuntimeProvider.ts
 *
 * Единый провайдер runtime-возможностей.
 * Каждый провайдер отвечает за свой Contribution:
 * - предоставляет Accessor для свойств (state/computed)
 * - подписывает на события
 */

import type { Accessor } from './Accessor'
import type { ContractMember } from '../contract/types'

export interface RuntimeProvider {
	/** Для данного члена контракта создать Accessor (state/computed). */
	getAccessor(member: ContractMember): Accessor | undefined

	/**
	 * Подписаться на событие.
	 * Возвращает функцию отписки. Если событие не обрабатывается — undefined.
	 */
	subscribe(event: string, handler: (...args: any[]) => void): (() => void) | undefined
}
