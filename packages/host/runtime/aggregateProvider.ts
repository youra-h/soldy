/**
 * @soldy/host — runtime/aggregateProvider.ts
 *
 * Композитный провайдер: перебирает зарегистрированные провайдеры
 * и возвращает первый подходящий IAccessor или подписку.
 */

import type { TEventHandler } from '@soldy/core'
import type { IAccessor } from './types'
import type { IEventProvider } from './types'
import type { IContractMember } from '../contract/types'

export class TAggregateEventProvider implements IEventProvider {
	private providers: IEventProvider[] = []

	addProvider(provider: IEventProvider): void {
		this.providers.push(provider)
	}

	getAccessor(member: IContractMember): IAccessor | undefined {
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
