import type { TComponentEvents, IComponentProps } from '@soldy/core'

export interface PropertyContract<TEvents extends Record<string, any> = TComponentEvents> {
	get: (instance: any) => any
	set?: (instance: any, value: any) => void
	triggers: (keyof TEvents)[]
}

export interface ComponentContract<
	TProps extends Record<string, any> = IComponentProps,
	TEvents extends Record<string, any> = TComponentEvents,
> {
	/** Свойства, которые можно передать извне (есть set) */
	props: { [K in keyof TProps]?: PropertyContract<TEvents> }
	/** Вычисляемые read-only свойства (нет set — только get + triggers) */
	derived?: Record<string, PropertyContract<TEvents>>
	/** Core-события */
	events: (keyof TEvents)[]
	/** Плагины */
	plugins: (new (...args: any[]) => any)[]
}

export function createContract<TProps extends Record<string, any>, TEvents extends Record<string, any>>(
	contract: ComponentContract<TProps, TEvents>,
): ComponentContract<TProps, TEvents> & {
	extend: <TExtProps extends Record<string, any>, TExtEvents extends Record<string, any>>(
		extension: Partial<ComponentContract<TExtProps, TExtEvents>>,
	) => ComponentContract<TProps & TExtProps, TEvents & TExtEvents> & {
		extend: (...args: any[]) => any
	}
} {
	return {
		...contract,

		extend<TExtProps extends Record<string, any>, TExtEvents extends Record<string, any>>(
			extension: Partial<ComponentContract<TExtProps, TExtEvents>>,
		) {
			return createContract<TProps & TExtProps, TEvents & TExtEvents>({
				props: { ...contract.props, ...extension.props } as any,
				derived: { ...contract.derived, ...extension.derived } as any,
				events: [...contract.events, ...(extension.events ?? [])] as any,
				plugins: [...contract.plugins, ...(extension.plugins ?? [])],
			})
		},
	}
}
