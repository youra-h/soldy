/**
 * @soldy/provider — accessor.ts
 *
 * ComponentAccessor — единая точка доступа к свойствам и событиям компонента.
 *
 * Не зависит от конкретного фреймворка. Принимает скомпилированные props/events,
 * экземпляр компонента и карту плагинов (namespace → экземпляр плагина).
 *
 * Используется UI-адаптерами (Vue, React, ...) через единый API:
 * getProps, getEvents, getExportName, getTriggers, getValue, setValue, getEventSource.
 */

import type { ICompiledProp, ICompiledEvent, ICompiledItem } from './contract'

export class ComponentAccessor {
	constructor(
		private props: ICompiledProp[],
		private events: ICompiledEvent[],
		private instance: any,
		private pluginsMap: Map<string, any>,
	) {}

	/** Получить объект-источник по namespace.
	 *  Если namespace нет — это сам компонент (instance).
	 *  Если есть — соответствующий плагин из pluginsMap. */
	private getTarget(namespace?: string): any {
		return namespace ? this.pluginsMap.get(namespace) : this.instance
	}

	/** Все свойства. Если includeProtected=false — только публичные. */
	getProps(includeProtected = false): ICompiledProp[] {
		if (includeProtected) return this.props
		return this.props.filter((p) => !p.protected)
	}

	/** Все события. */
	getEvents(): ICompiledEvent[] {
		return this.events
	}

	/** Вычисляет итоговый ключ для UI: 'ready' или 'element:ready' */
	getExportName(item: ICompiledItem): string {
		return item.namespace ? `${item.namespace}:${item.name}` : item.name
	}

	/** Возвращает скомпилированные триггеры свойства с префиксами namespace */
	getTriggers(prop: ICompiledProp): string[] {
		return prop.triggers.map((trigger) =>
			prop.namespace ? `${prop.namespace}:${trigger}` : trigger,
		)
	}

	/** Получить источник событий для элемента (events объекта) */
	getEventSource(item: ICompiledItem): any {
		const target = this.getTarget(item.namespace)
		return target?.events ?? target
	}

	/** Прочитать значение свойства из целевого объекта */
	getValue(prop: ICompiledProp): any {
		const target = this.getTarget(prop.namespace)
		return target ? target[prop.name] : undefined
	}

	/** Записать значение свойства в целевой объект (только для не-protected) */
	setValue(prop: ICompiledProp, value: any): void {
		if (prop.protected) return
		const target = this.getTarget(prop.namespace)
		if (target && prop.name in target) {
			target[prop.name] = value
		}
	}
}
