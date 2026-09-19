/**
 * TAccessor — единый accessor для любых объектов.
 *
 * Принимает IAccessorUnit[] (каждый unit = {instance, props, events}).
 * Из каждого unit'а создаёт свойства (`TProperty`) и события с прямой ссылкой
 * на instance — никакого namespace, pluginsMap или collection. Читает, пишет и
 * следит за свойством оно само; аксессор знает только, какие свойства и
 * события у компонента есть.
 *
 * Дублирующиеся имена props/events выбрасывают ошибку при создании.
 */

import type { IAccessor } from './accessor.interface'
import type { IAccessorEvent, IAccessorUnit } from './contract'
import { TProperty, eventSourceOf } from './property.class'

export class TAccessor implements IAccessor {
	private readonly _props: TProperty[] = []
	private readonly _events: IAccessorEvent[] = []

	constructor(units: readonly IAccessorUnit[]) {
		const seenProps = new Set<string>()
		const seenEvents = new Set<string>()

		for (const unit of units) {
			const instance = unit.instance

			if (!instance) continue

			for (const declaration of unit.props ?? []) {
				if (seenProps.has(declaration.name.getName())) {
					throw new Error(`[TAccessor] Duplicate prop "${declaration.name.getName()}"`)
				}

				seenProps.add(declaration.name.getName())

				this._props.push(new TProperty(declaration, instance))
			}

			for (const name of unit.events ?? []) {
				if (seenEvents.has(name.getName())) {
					throw new Error(`[TAccessor] Duplicate event "${name.getName()}"`)
				}

				seenEvents.add(name.getName())

				this._events.push({ name, instance, source: eventSourceOf(instance) })
			}
		}
	}

	getProps(includeProtected = false): TProperty[] {
		return includeProtected ? this._props : this._props.filter((prop) => !prop.protected)
	}

	getEvents(): IAccessorEvent[] {
		return this._events
	}
}
