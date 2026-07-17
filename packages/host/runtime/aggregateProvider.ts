/**
 * @soldy/host — runtime/aggregateProvider.ts
 *
 * Композитный провайдер: перебирает зарегистрированные провайдеры
 * и возвращает первый подходящий Accessor.
 */

import type { AccessorProvider, Accessor } from './Accessor'
import type { ContractMember } from '../contract/types'

export class AggregateAccessorProvider implements AccessorProvider {
	private providers: AccessorProvider[] = []

	addProvider(provider: AccessorProvider): void {
		this.providers.push(provider)
	}

	getAccessor(member: ContractMember): Accessor | undefined {
		for (const p of this.providers) {
			const accessor = p.getAccessor(member)
			if (accessor) return accessor
		}
		return undefined
	}
}
