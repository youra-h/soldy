import type { IComponentSchema, ISchema } from './types'

export function createSchema<
	TProps extends Record<string, any>,
	TEvents extends Record<string, any>,
>(
	schema: IComponentSchema<TProps, TEvents>,
): ISchema<TProps, TEvents> {
	return {
		...schema,

		extend<TExtProps extends Record<string, any>, TExtEvents extends Record<string, any>>(
			extension: Partial<IComponentSchema<TExtProps, TExtEvents>>,
		) {
			return createSchema<TProps & TExtProps, TEvents & TExtEvents>({
				props: { ...schema.props, ...extension.props } as any,
				computed: { ...schema.computed, ...extension.computed } as any,
				events: [...schema.events, ...(extension.events ?? [])] as any,
				plugins: [...schema.plugins, ...(extension.plugins ?? [])],
			})
		},
	}
}
