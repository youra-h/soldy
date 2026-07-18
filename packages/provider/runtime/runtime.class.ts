/**
 * @soldy/provider — runtime/TRuntime.ts
 *
 * Живая система, связывающая IComponentModel и IEventProvider.
 * Строит подписки на изменения свойств И событий через единый провайдер.
 * Не знает кто такой плагин, компонент или emitter.
 */

import type { IComponentModel } from '../contract/types'
import type { IAccessor, IProvider, TEmitPayload } from './types'

export class TRuntime {
	readonly model: IComponentModel
	private accessors = new Map<string, IAccessor>()
	private subscribers = new Set<(payload: TEmitPayload) => void>()
	private disposers: (() => void)[] = []

	constructor(model: IComponentModel, provider: IProvider) {
		this.model = model

		// 1. Подписка на изменения свойств через IAccessor
		for (const prop of model.props) {
			if (prop.kind === 'event') continue

			const accessor = provider.getAccessor(prop)
			if (!accessor) continue

			this.accessors.set(prop.name, accessor)

			const unsub = accessor.subscribe(() => {
				this.notify({
					type: 'property',
					name: prop.name,
					value: accessor.get(),
					mutable: prop.mutable ?? true, // по умолчанию state → true, computed → false
				})
			})
			this.disposers.push(unsub)
		}

		// 2. Подписка на события через провайдер
		for (const eventName of model.events) {
			const unsub = provider.subscribe?.(eventName, (...args: any[]) => {
				this.notify({
					type: 'event',
					name: eventName,
					args,
				})
			})

			if (unsub) this.disposers.push(unsub)
		}
	}

	getValue(name: string): any {
		return this.accessors.get(name)?.get()
	}

	setValue(name: string, value: any): boolean {
		const accessor = this.accessors.get(name)

		if (!accessor?.set) return false

		accessor.set(value)

		return true
	}

	subscribe(fn: (payload: TEmitPayload) => void): () => void {
		this.subscribers.add(fn)
		return () => this.subscribers.delete(fn)
	}

	private notify(payload: TEmitPayload): void {
		this.subscribers.forEach((fn) => fn(payload))
	}

	dispose(): void {
		this.subscribers.clear()
		this.disposers.forEach((fn) => fn())
		this.disposers = []
	}
}
