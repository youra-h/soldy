/** Базовый контракт аксессора — общий для TComponentAccessor и TCollectionAccessor */
export interface IAccessor {
	getProps(includeProtected?: boolean): any[]
	getEvents(): any[]
	getValue(prop: any): any
	setValue(prop: any, value: any): void
	getEventSource(item: any): any
	getSchema(): { props: any[]; events: any[] }
	getExportName(item: any): string
	getTriggers(prop: any): string[]
}
