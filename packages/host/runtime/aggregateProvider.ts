/**
 * @soldy/host — runtime/aggregateProvider.ts
 *
 * Композитный провайдер: перебирает зарегистрированные провайдеры
 * и возвращает первый подходящий Accessor или подписку.
 */

import type { Accessor } from './Accessor'
import type { RuntimeProvider } from './AccessorProvider'
import type { ContractMember } from '../contract/types'

export class AggregateRuntimeProvider implements RuntimeProvider {
	private providers: RuntimeProvider[] = []

	addProvider(provider: RuntimeProvider): void {
		this.providers.push(provider)
	}

	getAccessor(member: ContractMember): Accessor | undefined {
		for (const p of this.providers) {
			const accessor = p.getAccessor(member)
			if (accessor) return accessor
		}
		return undefined
	}

	subscribe(event: string, handler: (...args: any[]) => void): (() => void) | undefined {
		for (const p of this.providers) {
			const unsub = p.subscribe(event, handler)
			if (unsub) return unsub
		}
		return undefined
	}
}
