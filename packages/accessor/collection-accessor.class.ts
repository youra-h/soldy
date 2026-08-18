/**
 * TCollectionAccessor — единая точка доступа к свойствам и событиям коллекции.
 *
 * Принимает ICollectionCore = { engine, extensions }.
 * getValue/setValue используют prop.get/set если определены, иначе fallback через source.
 * getEventSource: 'engine' → engine.events, иначе → extensions[source].events.
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
		/** ICollectionCore = { engine, extensions } */
		private core: any,
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

	getEventSource(item: ICompiledItem): any {
		const source = (item as ICompiledCollectionProp).source ?? 'engine'
		if (source === 'engine') return this.core.engine.events
		return this.core.extensions[source]?.events
	}

	getValue(prop: ICompiledCollectionProp): any {
		if (prop.get) return prop.get(this.core)
		if (prop.source === 'engine') return this.core.engine[prop.name]
		return this.core.extensions[prop.source]?.[prop.name]
	}

	setValue(prop: ICompiledCollectionProp, value: any): void {
		if (prop.protected) return
		if (prop.set) {
			prop.set(this.core, value)
		} else if (prop.source !== 'engine') {
			const ext = this.core.extensions[prop.source]
			if (ext && prop.name in ext) ext[prop.name] = value
		}
	}
}
