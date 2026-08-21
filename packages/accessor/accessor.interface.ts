import type { IAccessorProp, IAccessorEvent } from './contract'

/** Базовый контракт accessor'а */
export interface IAccessor {
	getProps(includeProtected?: boolean): IAccessorProp[]
	getEvents(): IAccessorEvent[]
	getValue(prop: IAccessorProp): any
	setValue(prop: IAccessorProp, value: any): void
	getEventSource(item: IAccessorProp | IAccessorEvent): any
}
