/**
 * @soldy/provider — accessor.ts
 *
 * ComponentAccessor — единая точка доступа к свойствам и событиям компонента.
 *
 * Делегирует форматирование имён DescriptorInspector'у.
 * Сам занимается только рантайм-доступом: getValue, setValue, getEventSource.
 */

import { DescriptorInspector } from './inspector'
import type { ICompiledProp, ICompiledEvent, ICompiledItem } from './contract'

export class ComponentAccessor {
	private inspector: DescriptorInspector

	constructor(
		private props: ICompiledProp[],
		private events: ICompiledEvent[],
		private instance: any,
		private pluginsMap: Map<string, any>,
	) {
		this.inspector = new DescriptorInspector({ props, events })
	}

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
		return this.inspector.getExportName(item)
	}

	/** Возвращает скомпилированные триггеры свойства с префиксами namespace */
	getTriggers(prop: ICompiledProp): string[] {
		return this.inspector.getExportTriggers(prop)
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
