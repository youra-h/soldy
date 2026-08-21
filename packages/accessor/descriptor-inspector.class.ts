/**
 * TDescriptorInspector — форматирует имена props/events для конкретного фреймворка.
 *
 * Принимает либо IAccessor (runtime), либо статические массивы (build time, useProps/useEmits).
 * Не знает ничего о instances, plugins или коллекциях — только TName и naming strategy.
 */

import type { IAccessor } from './accessor.interface'
import type { INamingStrategy, TName } from './contract'

type TStaticProp = {
	name: TName
	type?: any
	protected?: boolean
	triggers?: TName[]
}

export class TDescriptorInspector {
	private readonly _props: TStaticProp[]
	private readonly _events: TName[]
	private readonly _naming?: INamingStrategy

	constructor(
		propsOrAccessor: TStaticProp[] | IAccessor,
		eventsOrNaming?: TName[] | INamingStrategy,
		naming?: INamingStrategy,
	) {
		if (Array.isArray(propsOrAccessor)) {
			// Статический режим: props[] + events[]
			this._props = propsOrAccessor
			this._events = Array.isArray(eventsOrNaming) ? eventsOrNaming : []
			this._naming = Array.isArray(eventsOrNaming) ? naming : (eventsOrNaming as INamingStrategy)
		} else {
			// Runtime режим: IAccessor
			const accessor = propsOrAccessor as IAccessor
			this._props = accessor.getProps(true)
			this._events = accessor.getEvents().map((e) => e.name)
			this._naming = eventsOrNaming as INamingStrategy | undefined
		}
	}

	getExportPropName(prop: TStaticProp): string {
		return this._naming ? this._naming.prop(prop.name) : prop.name.getName()
	}

	getExportEventName(item: TName): string {
		return this._naming ? this._naming.event(item) : item.getName()
	}

	/** Raw имена триггеров — для подписки на instance.events */
	getRawTriggers(prop: TStaticProp): string[] {
		return (prop.triggers ?? []).map((t) => t.name)
	}

	/** Полные имена триггеров — для emit наружу */
	getExportTriggers(prop: TStaticProp): string[] {
		return (prop.triggers ?? []).map((t) =>
			this._naming ? this._naming.event(t) : t.getName(),
		)
	}

	/** Для useProps/useEmits (статический слой) */
	getExportProps(defaults: Record<string, any> = {}): Record<string, any> {
		const result: Record<string, any> = {}

		for (const prop of this._props) {
			if (prop.protected) continue

			const exportName = this.getExportPropName(prop)
			const config: Record<string, any> = {}

			if (prop.type !== undefined) config.type = prop.type
			if (prop.name.name in defaults) config.default = defaults[prop.name.name]

			result[exportName] = config
		}

		return result
	}

	/** Для useEmits (статический слой) */
	getExportEvents(): string[] {
		const result: string[] = []

		for (const name of this._events) {
			result.push(this.getExportEventName(name))
		}

		for (const prop of this._props) {
			result.push(...this.getExportTriggers(prop))
		}

		return [...new Set(result)]
	}
}
