/**
 * TDescriptorInspector — форматирует имена props/events для конкретного фреймворка.
 *
 * Принимает либо IAccessor (runtime), либо статические массивы (build time, useProps/useEmits).
 * Не знает ничего о instances, plugins или коллекциях — только имена и типы.
 */

import type { IAccessor } from './accessor.interface'
import type { IAccessorProp, IAccessorEvent, IPropDeclaration, INamingStrategy } from './contract'

type TStaticProp = Pick<IAccessorProp | IPropDeclaration, 'name' | 'type'> & {
	protected?: boolean
	triggers?: string[]
}

export class TDescriptorInspector {
	private readonly _props: TStaticProp[]
	private readonly _events: string[]
	private readonly _naming?: INamingStrategy

	constructor(
		propsOrAccessor: TStaticProp[] | IAccessor,
		eventsOrNaming?: string[] | INamingStrategy,
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
		return this._naming ? this._naming.prop(prop.name) : prop.name
	}

	getExportEventName(name: string | IAccessorEvent): string {
		const n = typeof name === 'string' ? name : name.name
		return this._naming ? this._naming.event(n) : n
	}

	getRawTriggers(prop: TStaticProp): string[] {
		return prop.triggers ?? []
	}

	getExportTriggers(prop: TStaticProp): string[] {
		if (!this._naming) return this.getRawTriggers(prop)
		return this.getRawTriggers(prop).map((t) => this._naming!.event(t))
	}

	/** Для useProps/useEmits (статический слой) */
	getExportProps(defaults: Record<string, any> = {}): Record<string, any> {
		const result: Record<string, any> = {}

		for (const prop of this._props) {
			if (prop.protected) continue

			const exportName = this.getExportPropName(prop)
			const config: Record<string, any> = {}

			if (prop.type !== undefined) config.type = prop.type
			if (prop.name in defaults) config.default = defaults[prop.name]

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
