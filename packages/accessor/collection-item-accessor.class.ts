/**
 * TCollectionItemAccessor — единая точка доступа к item-адаптерам коллекции.
 *
 * Аналог TCollectionAccessor, но для дочерней стороны (TabItem, CollapseItem).
 * Читает значения из adapters[source][name] вместо collection.extensions[source][name].
 * Event source — родительские extension events (те же, что у TCollectionAccessor).
 *
 * Публичный API идентичен TComponentAccessor — useSyncProps / useSyncEvents без изменений.
 */

import { TDescriptorInspector } from './descriptor-inspector.class'
import type {
	ICompiledProp,
	ICompiledEvent,
	ICompiledItem,
	ICompiledCollectionProp,
	ICollectionSchema,
} from './contract'

export class TCollectionItemAccessor {
	private inspector: TDescriptorInspector

	constructor(
		private props: ICompiledCollectionProp[],
		private events: ICompiledEvent[],
		/** item adapters: TItemContext.adapters (activation, order, tabs, ...) */
		private adapters: any,
		/** родительская коллекция — источник events */
		private collection: any,
	) {
		this.inspector = new TDescriptorInspector({ props, events } as any)
	}

	getSchema(): ICollectionSchema {
		return { props: this.props, events: this.events }
	}

	getProps(includeProtected = false): ICompiledCollectionProp[] {
		if (includeProtected) return this.props
		return this.props.filter((p) => !p.protected)
	}

	getEvents(): ICompiledEvent[] {
		return this.events
	}

	getExportName(item: ICompiledItem): string {
		return this.inspector.getExportName(item)
	}

	getTriggers(prop: ICompiledProp): string[] {
		return this.inspector.getExportTriggers(prop)
	}

	/** Event source живёт на родительском расширении, не на адаптере */
	getEventSource(item: ICompiledItem): any {
		const source = (item as ICompiledCollectionProp).source ?? 'engine'
		if (source === 'engine') return this.collection.engine.events
		return this.collection.extensions[source]?.events
	}

	/** Читаем из адаптера элемента, не из коллекции */
	getValue(prop: ICompiledCollectionProp): any {
		return this.adapters?.[prop.source]?.[prop.name]
	}

	/** Пишем через адаптер (set active, set selected — через parent extension) */
	setValue(prop: ICompiledCollectionProp, value: any): void {
		if (prop.protected) return
		if (this.adapters?.[prop.source]) {
			this.adapters[prop.source][prop.name] = value
		}
	}
}
