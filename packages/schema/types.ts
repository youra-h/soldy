import type { TComponentEvents, IComponentProps } from '@soldy/core'

export interface IPropertySchema<TEvents extends Record<string, any> = TComponentEvents> {
	get: (instance: any) => any
	set?: (instance: any, value: any) => void
	triggers: (keyof TEvents)[]
}

export interface IComponentSchema<
	TProps extends Record<string, any> = IComponentProps,
	TEvents extends Record<string, any> = TComponentEvents,
> {
	/** Свойства, которые можно передать извне (есть set) */
	props: { [K in keyof TProps]?: IPropertySchema<TEvents> }
	/** Вычисляемые read-only свойства (нет set — только get + triggers) */
	derived?: Record<string, IPropertySchema<TEvents>>
	/** Core-события */
	events: (keyof TEvents)[]
	/** Плагины */
	plugins: (new (...args: any[]) => any)[]
}
