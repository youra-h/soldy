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
	type?: unknown
	protected?: boolean
	triggers?: TName[]
	/** Умолчание из декларации: значим ключ, а не значение (см. `IPropDeclaration.default`). */
	default?: unknown
}

/** Настройка пропа для статического слоя фреймворка: тип и значение по умолчанию. */
export type TExportPropConfig = { type?: unknown; default?: unknown }

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

	/**
	 * Для useProps/useEmits (статический слой).
	 *
	 * `default` берётся из декларации и попадает в конфиг, только если ключ в
	 * ней есть: `default: undefined` — тоже объявленное умолчание. Карту
	 * умолчаний со стороны инспектор не принимает: поиск в ней по имени без
	 * неймспейса не давал умолчаний пропам плагинов, а при совпадении имён
	 * отдал бы им чужое.
	 */
	getExportProps(): Record<string, TExportPropConfig> {
		const result: Record<string, TExportPropConfig> = {}

		for (const prop of this._props) {
			if (prop.protected) continue

			const exportName = this.getExportPropName(prop)
			const config: TExportPropConfig = {}

			if (prop.type !== undefined) config.type = prop.type
			if (Object.hasOwn(prop, 'default')) config.default = prop.default

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
