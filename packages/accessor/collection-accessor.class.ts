/**
 * @soldy/accessor — collection-accessor.ts
 *
 * TCollectionAccessor — единая точка доступа к свойствам и событиям коллекции.
 *
 * Публичный API идентичен TComponentAccessor — поэтому useSyncProps / useSyncEvents
 * работают с ним без изменений.
 *
 * Отличие: getTarget разрешает source → collection.engine или collection.extensions[name].
 */

import { TDescriptorInspector } from './descriptor-inspector.class'
import type {
	ICompiledProp,
	ICompiledEvent,
	ICompiledItem,
	ICompiledCollectionProp,
	ICollectionSchema,
} from './contract'

export class TCollectionAccessor {
	private inspector: TDescriptorInspector

	constructor(
		private props: ICompiledCollectionProp[],
		private events: ICompiledEvent[],
		private collection: any, // TCollection<any, any>
	) {
		// TDescriptorInspector видит только ICompiledProp (без source) — это ок, ему source не нужен
		this.inspector = new TDescriptorInspector({ props, events } as any)
	}

	/** Возвращает схему коллекции — используется для createInspector */
	getSchema(): ICollectionSchema {
		return { props: this.props, events: this.events }
	}

	/** Получить объект-источник по source поля. engine → collection.engine, иначе → collection.extensions[name] */
	private getTarget(prop: ICompiledCollectionProp): any {
		if (prop.source === 'engine') return this.collection.engine
		return this.collection.extensions[prop.source]
	}

	/** Все свойства. Если includeProtected=false — только публичные. */
	getProps(includeProtected = false): ICompiledCollectionProp[] {
		if (includeProtected) return this.props

		return this.props.filter((p) => !p.protected)
	}

	/** Все события. */
	getEvents(): ICompiledEvent[] {
		return this.events
	}

	/** Вычисляет итоговый ключ для UI */
	getExportName(item: ICompiledItem): string {
		return this.inspector.getExportName(item)
	}

	/** Возвращает скомпилированные триггеры свойства */
	getTriggers(prop: ICompiledProp): string[] {
		return this.inspector.getExportTriggers(prop)
	}

	/** Получить источник событий для элемента */
	getEventSource(item: ICompiledItem): any {
		// Для событий без source — слушаем engine.events
		const source = (item as ICompiledCollectionProp).source ?? 'engine'

		if (source === 'engine') return this.collection.engine.events

		return this.collection.extensions[source]?.events
	}

	/** Прочитать значение свойства из коллекции */
	getValue(prop: ICompiledCollectionProp): any {
		if (prop.source === 'engine') {
			// engine — ReadonlyArray<T> proxy, именованных свойств нет
			if (prop.name === 'items') return [...this.collection.engine]
			if (prop.name === 'count') return this.collection.engine.length
			return undefined
		}

		const ext = this.collection.extensions[prop.source]

		return ext?.[prop.name]?.valueOf?.() ?? ext?.[prop.name]
	}

	/** Записать значение в коллекцию (только для не-protected) */
	setValue(prop: ICompiledCollectionProp, value: any): void {
		if (prop.protected) return

		// Только items → engine поддерживает запись (через plain.setItems)
		if (prop.source === 'engine' && prop.name === 'items') {
			this.collection.extensions.plain?.setItems?.(value)
		}
	}
}
