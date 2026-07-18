/**
 * Композитный провайдер: перебирает зарегистрированные провайдеры.
 * Каждый провайдер может реализовывать IAccessorProvider, IEventProvider или оба.
 */

import type { TEventHandler } from '@soldy/core'
import type { IAccessor, IAccessorProvider, IEventProvider, IProvider } from './types'
import type { IContractProp } from '../contract/types'

export class TAggregateProvider implements IProvider {
	private providers: (IAccessorProvider | IEventProvider)[] = []

	add(provider: IAccessorProvider | IEventProvider): this {
		this.providers.push(provider)
		return this
	}

	getAccessor(prop: IContractProp): IAccessor | undefined {
		for (const p of this.providers) {
			if (!('getAccessor' in p)) continue

			const accessor = (p as IAccessorProvider).getAccessor(prop)
			if (accessor) return accessor
		}
		return undefined
	}

	subscribe(event: string, handler: TEventHandler): (() => void) | undefined {
		for (const p of this.providers) {
			if (!('subscribe' in p)) continue

			const unsub = (p as IEventProvider).subscribe(event, handler)
			if (unsub) return unsub
		}
		return undefined
	}
}
