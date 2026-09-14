import type { IEventSource } from '@soldy/core'
import type { IAccessorProp, IAccessorEvent } from './contract'

/** Базовый контракт accessor'а */
export interface IAccessor {
	getProps(includeProtected?: boolean): IAccessorProp[]
	getEvents(): IAccessorEvent[]
	getValue(prop: IAccessorProp): unknown
	setValue(prop: IAccessorProp, value: unknown): void
	/** Источник событий unit'а; `undefined`, если у instance нет `on`/`off`. */
	getEventSource(item: IAccessorProp | IAccessorEvent): IEventSource | undefined
}
