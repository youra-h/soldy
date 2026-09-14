/**
 * TAccessor — единый accessor для любых объектов.
 *
 * Принимает IAccessorUnit[] (каждый unit = {instance, props, events}).
 * Из каждого unit'а создаёт IAccessorProp[] и IAccessorEvent[] с прямой
 * ссылкой на instance — никакого namespace, pluginsMap или collection.
 *
 * Дублирующиеся имена props/events выбрасывают ошибку при создании.
 */

import type { IEventSource } from '@soldy/core'
import type { IAccessor } from './accessor.interface'
import type { IAccessorProp, IAccessorEvent, IAccessorUnit } from './contract'

/** Эмиттер или `TEvented`: то, на что адаптер подписывается через `on`/`off`. */
function isEventSource(value: unknown): value is IEventSource {
	return (
		typeof value === 'object' &&
		value !== null &&
		'on' in value &&
		typeof value.on === 'function' &&
		'off' in value &&
		typeof value.off === 'function'
	)
}

export class TAccessor implements IAccessor {
	private readonly _props: IAccessorProp[] = []
	private readonly _events: IAccessorEvent[] = []

	constructor(units: IAccessorUnit[]) {
		const seenProps = new Set<string>()
		const seenEvents = new Set<string>()

		for (const unit of units) {
			const instance = unit.instance

			if (!instance) continue

			for (const decl of unit.props ?? []) {
				if (seenProps.has(decl.name.getName())) {
					throw new Error(`[TAccessor] Duplicate prop "${decl.name.getName()}"`)
				}

				seenProps.add(decl.name.getName())

				this._props.push({
					name: decl.name,
					instance,
					type: decl.type,
					protected: !!decl.protected,
					triggers: decl.triggers ?? [],
					get: decl.get,
					set: decl.set,
				})
			}

			for (const name of unit.events ?? []) {
				if (seenEvents.has(name.getName())) {
					throw new Error(`[TAccessor] Duplicate event "${name.getName()}"`)
				}

				seenEvents.add(name.getName())

				this._events.push({ name, instance })
			}
		}
	}

	getProps(includeProtected = false): IAccessorProp[] {
		return includeProtected ? this._props : this._props.filter((p) => !p.protected)
	}

	getEvents(): IAccessorEvent[] {
		return this._events
	}

	/** prop.get(instance) если задан, иначе instance[name] (со снимком через valueOf) */
	getValue(prop: IAccessorProp): unknown {
		if (prop.get) return prop.get(prop.instance)

		const value: unknown = Reflect.get(prop.instance, prop.name.name)

		if (typeof value === 'object' && value !== null && typeof value.valueOf === 'function') {
			return value.valueOf() ?? value
		}

		return value
	}

	/** prop.set(instance, value) если задан, иначе instance[name] = value */
	setValue(prop: IAccessorProp, value: unknown): void {
		if (prop.protected) return

		if (prop.set) {
			prop.set(prop.instance, value)
			return
		}

		if (prop.name.name in prop.instance) {
			Reflect.set(prop.instance, prop.name.name, value)
		}
	}

	/** instance.events (или сам instance, если events отсутствуют) */
	getEventSource(item: IAccessorProp | IAccessorEvent): IEventSource | undefined {
		const events: unknown = Reflect.get(item.instance, 'events')
		const source = events ?? item.instance

		return isEventSource(source) ? source : undefined
	}
}
