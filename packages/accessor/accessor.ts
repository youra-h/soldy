/**
 * @soldy/accessor — accessor.ts
 *
 * TComponentAccessor — единая точка доступа к свойствам и событиям компонента.
 *
 * Делегирует форматирование имён TDescriptorInspector'у.
 * Сам занимается только рантайм-доступом: getValue, setValue, getEventSource.
 */

import { TDescriptorInspector } from './inspector'
import type { ICompiledProp, ICompiledEvent, ICompiledItem, IComponentSchema } from './contract'

export class TComponentAccessor {
	private inspector: TDescriptorInspector

	constructor(
		private props: ICompiledProp[],
		private events: ICompiledEvent[],
		private instance: any,
		private pluginsMap: Map<string, any>,
		private compositionsMap: Map<string, (instance: any) => any> = new Map(),
	) {
		this.inspector = new TDescriptorInspector({ props, events })
	}

	/** Возвращает схему компонента — используется createVueAdapter для создания DescriptorInspector */
	getSchema(): IComponentSchema {
		return { props: this.props, events: this.events }
	}

	/** Получить объект-источник по namespace.
	 *  Если namespace === undefined — сам компонент (instance).
	 *  Если namespace === '' — безымянная композиция.
	 *  Иначе — именованная композиция или плагин. */
	private getTarget(namespace?: string): any {
		if (namespace === undefined) return this.instance

		if (namespace === '') {
			const comp = this.compositionsMap.get('')
			return comp ? comp(this.instance) : this.instance
		}

		const comp = this.compositionsMap.get(namespace)
		if (comp) return comp(this.instance)

		return this.pluginsMap.get(namespace)
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

		const value = target ? target[prop.name]?.valueOf() : undefined

		return value
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
