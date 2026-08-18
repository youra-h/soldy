/**
 * TCollectionItemAccessor — единая точка доступа к item-адаптерам коллекции.
 *
 * Принимает TItemContext (= { owner, adapters }).
 * getValue: prop.get(itemContext) или adapters[source][name] как fallback.
 * getEventSource: adapters[source].events — АДАПТЕРНЫЕ события с relay (change:active, change:order...).
 * setValue: prop.set(itemContext, value) или adapters[source][name] = value.
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
		/** TItemContext = { owner, adapters } */
		private itemContext: any,
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

	/** Источник событий — собственные события АДАПТЕРА (содержат relay: change:active, change:order...) */
	getEventSource(item: ICompiledItem): any {
		const source = (item as ICompiledCollectionProp).source
		return this.itemContext.adapters[source]?.events
	}

	getValue(prop: ICompiledCollectionProp): any {
		if (prop.get) return prop.get(this.itemContext)
		return this.itemContext.adapters[prop.source]?.[prop.name]
	}

	setValue(prop: ICompiledCollectionProp, value: any): void {
		if (prop.protected) return
		if (prop.set) {
			prop.set(this.itemContext, value)
		} else {
			const adapter = this.itemContext.adapters[prop.source]
			if (adapter && prop.name in adapter) adapter[prop.name] = value
		}
	}
}
