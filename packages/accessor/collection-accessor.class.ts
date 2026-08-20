/**
 * TCollectionAccessor — IAccessor для коллекции (родительский компонент: Tabs, ListBox...).
 * Читает состояние из collection.extensions[namespace] и collection.engine.
 *
 * TItemContextAccessor — IAccessor для item-контекста (дочерний компонент: TabItem...).
 * Читает состояние из context.adapters[extensionName].
 *
 * Оба реализуют IAccessor → совместимы с useSyncProps без изменений.
 */

import type { IAccessor } from './accessor.interface'
import type { ICompiledCollectionProp, ICompiledEvent, ICollectionSchema, INamingStrategy } from './contract'
import { TDescriptorInspector } from './descriptor-inspector.class'

export class TCollectionAccessor implements IAccessor {
	private readonly _inspector: TDescriptorInspector

	constructor(
		private readonly _schema: ICollectionSchema,
		private readonly _collection: any,
		naming?: INamingStrategy,
	) {
		this._inspector = new TDescriptorInspector(
			{ props: _schema.parentProps, events: _schema.parentEvents },
			naming,
		)
	}

	getSchema() {
		return { props: this._schema.parentProps, events: this._schema.parentEvents }
	}

	getProps(includeProtected = false): ICompiledCollectionProp[] {
		return includeProtected
			? this._schema.parentProps
			: this._schema.parentProps.filter((p) => !p.protected)
	}

	getEvents(): ICompiledEvent[] {
		return this._schema.parentEvents
	}

	getValue(prop: ICompiledCollectionProp): any {
		if (prop.get) {
			const target = prop.namespace ? this._collection.extensions[prop.namespace] : this._collection
			return prop.get(target)
		}
		// items всегда из engine (engine — array-like Proxy)
		if (prop.name === 'items') return this._collection.engine
		if (!prop.namespace) return undefined
		return this._collection.extensions[prop.namespace]?.[prop.name]
	}

	setValue(prop: ICompiledCollectionProp, value: any): void {
		if (prop.protected) return
		if (prop.set) {
			const target = prop.namespace ? this._collection.extensions[prop.namespace] : this._collection
			prop.set(target, value)
			return
		}
		// items — делегируем в batch.update
		if (prop.name === 'items') {
			this._collection.extensions.batch?.update?.(value)
			return
		}
		if (!prop.namespace) return
		const ext = this._collection.extensions[prop.namespace]
		if (ext && prop.name in ext) ext[prop.name] = value
	}

	getEventSource(prop: ICompiledCollectionProp): any {
		// items всегда слушается на engine.events
		if (prop.name === 'items') return this._collection.engine.events
		if (!prop.namespace) return undefined
		return this._collection.extensions[prop.namespace]?.events
	}

	getExportName(item: any): string {
		return this._inspector.getExportName(item)
	}

	getTriggers(prop: any): string[] {
		return this._inspector.getExportTriggers(prop)
	}
}

export class TItemContextAccessor implements IAccessor {
	private readonly _inspector: TDescriptorInspector

	constructor(
		private readonly _schema: ICollectionSchema,
		private readonly _context: any,
		naming?: INamingStrategy,
	) {
		this._inspector = new TDescriptorInspector(
			{ props: _schema.itemProps, events: _schema.itemEvents },
			naming,
		)
	}

	getSchema() {
		return { props: this._schema.itemProps, events: this._schema.itemEvents }
	}

	getProps(includeProtected = false): ICompiledCollectionProp[] {
		return includeProtected
			? this._schema.itemProps
			: this._schema.itemProps.filter((p) => !p.protected)
	}

	getEvents(): ICompiledEvent[] {
		return this._schema.itemEvents
	}

	getValue(prop: ICompiledCollectionProp): any {
		const adapter = this._context.adapters[prop.namespace!]
		if (prop.get) return prop.get(adapter)
		return adapter?.[prop.name]
	}

	setValue(prop: ICompiledCollectionProp, value: any): void {
		if (prop.protected) return
		const adapter = this._context.adapters[prop.namespace!]
		if (!adapter) return
		if (prop.set) {
			prop.set(adapter, value)
			return
		}
		if (prop.name in adapter) adapter[prop.name] = value
	}

	getEventSource(prop: ICompiledCollectionProp): any {
		return this._context.adapters[prop.namespace!]?.events
	}

	getExportName(item: any): string {
		return this._inspector.getExportName(item)
	}

	getTriggers(prop: any): string[] {
		return this._inspector.getExportTriggers(prop)
	}
}
