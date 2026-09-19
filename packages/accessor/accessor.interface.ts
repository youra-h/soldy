import type { IAccessorEvent } from './contract'
import type { TProperty } from './property.class'

/** Базовый контракт accessor'а */
export interface IAccessor {
	getProps(includeProtected?: boolean): TProperty[]
	getEvents(): IAccessorEvent[]
}
