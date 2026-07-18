/**
 * @soldy/host — runtime/aggregateProvider.ts
 *
 * Композитный провайдер: перебирает зарегистрированные провайдеры
 * и возвращает первый подходящий Accessor или подписку.
 */

import type { TEventHandler } from '@soldy/core'
import type { Accessor } from './types'
import type { EventProvider } from './types'
import type { ContractMember } from '../contract/types'

export class AggregateEventProvider implements EventProvider {
	private providers: EventProvider[] = []

	addProvider(provider: EventProvider): void {
		this.providers.push(provider)
	}

	getAccessor(member: ContractMember): Accessor | undefined {
		for (const p of this.providers) {
			const accessor = p.getAccessor(member)
			if (accessor) return accessor
		}
		return undefined
	}

	subscribe(event: string, handler: TEventHandler): (() => void) | undefined {
		for (const p of this.providers) {
			const unsub = p.subscribe(event, handler)
			if (unsub) return unsub
		}
		return undefined
	}
}
