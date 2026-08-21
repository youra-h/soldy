/**
 * TAccessor — единый accessor для любых объектов.
 *
 * Принимает IAccessorUnit[] (каждый unit = {instance, props, events}).
 * Из каждого unit'а создаёт IAccessorProp[] и IAccessorEvent[] с прямой
 * ссылкой на instance — никакого namespace, pluginsMap или collection.
 *
 * Дублирующиеся имена props/events выбрасывают ошибку при создании.
 */

import type { IAccessor } from './accessor.interface'
import type { IAccessorProp, IAccessorEvent, IAccessorUnit } from './contract'

export class TAccessor implements IAccessor {
	private readonly _props: IAccessorProp[] = []
	private readonly _events: IAccessorEvent[] = []

	constructor(units: IAccessorUnit[]) {
		const seenProps = new Set<string>()
		const seenEvents = new Set<string>()

		for (const unit of units) {
			if (!unit.instance) continue

			for (const decl of unit.props ?? []) {
				if (seenProps.has(decl.name.getName())) {
					throw new Error(`[TAccessor] Duplicate prop "${decl.name.getName()}"`)
				}

				seenProps.add(decl.name.getName())

				this._props.push({
					name: decl.name,
					instance: unit.instance,
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

				this._events.push({ name, instance: unit.instance })
			}
		}
	}

	getProps(includeProtected = false): IAccessorProp[] {
		return includeProtected ? this._props : this._props.filter((p) => !p.protected)
	}

	getEvents(): IAccessorEvent[] {
		return this._events
	}

	/** prop.get(instance) если задан, иначе instance[name] */
	getValue(prop: IAccessorProp): any {
		if (prop.get) return prop.get(prop.instance)

		const val = prop.instance[prop.name.name]

		return val?.valueOf?.() ?? val
	}

	/** prop.set(instance, value) если задан, иначе instance[name] = value */
	setValue(prop: IAccessorProp, value: any): void {
		if (prop.protected) return

		if (prop.set) {
			prop.set(prop.instance, value)
			return
		}

		if (prop.name.name in prop.instance) {
			prop.instance[prop.name.name] = value
		}
	}

	/** instance.events (или сам instance, если events отсутствуют) */
	getEventSource(item: IAccessorProp | IAccessorEvent): any {
		return item.instance?.events ?? item.instance
	}
}
