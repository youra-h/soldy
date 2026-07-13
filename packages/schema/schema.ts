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

export function createSchema<
	TProps extends Record<string, any>,
	TEvents extends Record<string, any>,
>(
	contract: IComponentSchema<TProps, TEvents>,
): IComponentSchema<TProps, TEvents> & {
	extend: <TExtProps extends Record<string, any>, TExtEvents extends Record<string, any>>(
		extension: Partial<IComponentSchema<TExtProps, TExtEvents>>,
	) => IComponentSchema<TProps & TExtProps, TEvents & TExtEvents> & {
		extend: (...args: any[]) => any
	}
} {
	return {
		...contract,

		extend<TExtProps extends Record<string, any>, TExtEvents extends Record<string, any>>(
			extension: Partial<IComponentSchema<TExtProps, TExtEvents>>,
		) {
			return createSchema<TProps & TExtProps, TEvents & TExtEvents>({
				props: { ...contract.props, ...extension.props } as any,
				derived: { ...contract.derived, ...extension.derived } as any,
				events: [...contract.events, ...(extension.events ?? [])] as any,
				plugins: [...contract.plugins, ...(extension.plugins ?? [])],
			})
		},
	}
}
