import type { IComponentSchema, ISchema } from './types'

export function createSchema<
	TProps extends Record<string, any>,
	TEvents extends Record<string, any>,
>(
	contract: IComponentSchema<TProps, TEvents>,
): ISchema<TProps, TEvents> {
	return {
		...contract,

		extend<TExtProps extends Record<string, any>, TExtEvents extends Record<string, any>>(
			extension: Partial<IComponentSchema<TExtProps, TExtEvents>>,
		) {
			return createSchema<TProps & TExtProps, TEvents & TExtEvents>({
				props: { ...contract.props, ...extension.props } as any,
				computed: { ...contract.computed, ...extension.computed } as any,
				events: [...contract.events, ...(extension.events ?? [])] as any,
				plugins: [...contract.plugins, ...(extension.plugins ?? [])],
			})
		},
	}
}
