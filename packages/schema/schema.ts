import type { IComponentSchema, ISchema, IPropertySchema } from './types'

export function createSchema<
	TProps extends Record<string, any>,
	TEvents extends Record<string, any>,
>(schema: IComponentSchema<TProps, TEvents>): ISchema<TProps, TEvents> {
	return {
		...schema,

		getAllProps(): Record<string, IPropertySchema<TEvents> | undefined> {
			return { ...this.props, ...this.readonly }
		},

		getAllEvents(): (keyof TEvents & string)[] {
			const set = new Set<keyof TEvents & string>(this.events)

			for (const prop of Object.values(this.getAllProps())) {
				for (const event of prop?.triggers ?? []) {
					set.add(event)
				}
			}

			return [...set]
		},

		extend<TExtProps extends Record<string, any>, TExtEvents extends Record<string, any>>(
			extension: Partial<IComponentSchema<TExtProps, TExtEvents>>,
		) {
			return createSchema<TProps & TExtProps, TEvents & TExtEvents>({
				props: { ...schema.props, ...extension.props } as any,
				readonly: { ...schema.readonly, ...extension.readonly } as any,
				events: [...(schema.events ?? []), ...(extension.events ?? [])] as any,
				plugins: [...schema.plugins, ...(extension.plugins ?? [])],
				Ctor: (extension.Ctor ?? schema.Ctor) as any,
			})
		},
	}
}
