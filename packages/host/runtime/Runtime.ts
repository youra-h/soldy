/**
 * @soldy/host — runtime/Runtime.ts
 *
 * Живая система, связывающая ComponentModel и AccessorProvider.
 * Строит подписки на изменения свойств И событий, предоставляет единый subscribe.
 * Не знает кто такой плагин, компонент или emitter — только Accessor и IEventSource.
 */

import type { ComponentModel } from '../contract/types'
import type { Accessor } from './Accessor'
import type { AccessorProvider } from './AccessorProvider'
import type { IEventSource } from '@soldy/core'

export type EmitPayload =
	| { type: 'property'; name: string; value: any; mutable: boolean }
	| { type: 'event'; name: string; args: any[] }

export class Runtime {
	readonly model: ComponentModel
	private accessors = new Map<string, Accessor>()
	private subscribers = new Set<(payload: EmitPayload) => void>()
	private disposers: (() => void)[] = []

	constructor(
		model: ComponentModel,
		provider: AccessorProvider,
		eventSources: IEventSource[] = [],
	) {
		this.model = model

		// 1. Подписка на изменения свойств через Accessor
		for (const member of model.members) {
			if (member.kind === 'event') continue

			const accessor = provider.getAccessor(member)
			if (!accessor) continue

			this.accessors.set(member.name, accessor)

			const unsub = accessor.subscribe(() => {
				this.notify({
					type: 'property',
					name: member.name,
					value: accessor.get(),
					mutable: member.mutable,
				})
			})
			this.disposers.push(unsub)
		}

		// 2. Подписка на жизненные события от всех источников (единая шина)
		for (const eventName of model.events) {
			for (const source of eventSources) {
				const handler = (...args: any[]) => {
					this.notify({
						type: 'event',
						name: eventName,
						args,
					})
				}
				source.on(eventName as any, handler)
				this.disposers.push(() =>
					source.off(eventName as any, handler),
				)
			}
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

	subscribe(fn: (payload: EmitPayload) => void): () => void {
		this.subscribers.add(fn)
		return () => this.subscribers.delete(fn)
	}

	private notify(payload: EmitPayload): void {
		this.subscribers.forEach(fn => fn(payload))
	}

	dispose(): void {
		this.subscribers.clear()
		this.disposers.forEach(fn => fn())
		this.disposers = []
	}
}
