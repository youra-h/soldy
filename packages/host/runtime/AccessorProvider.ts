/**
 * @soldy/host — runtime/AccessorProvider.ts
 *
 * Провайдер создаёт Accessor для ContractMember'а.
 * Каждый провайдер отвечает за свои ownerId и возвращает undefined для чужих.
 * Runtime перебирает провайдеров через AggregateAccessorProvider.
 */

import type { Accessor } from './Accessor'
import type { ContractMember } from '../contract/types'

export interface AccessorProvider {
	/** Для данного члена контракта создать Accessor */
	getAccessor(member: ContractMember): Accessor | undefined
}
