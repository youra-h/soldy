/**
 * @soldy/host — runtime/AccessorProvider.ts
 *
 * Провайдер свойств: создаёт Accessor для ContractMember'а.
 * Каждый провайдер отвечает за свой ownerId.
 */

import type { Accessor } from './Accessor'
import type { ContractMember } from '../contract/types'

export interface AccessorProvider {
	/** Для данного члена контракта создать Accessor (state/computed). */
	getAccessor(member: ContractMember): Accessor | undefined
}
