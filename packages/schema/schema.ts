import type { IComponentSchema } from './types'

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
