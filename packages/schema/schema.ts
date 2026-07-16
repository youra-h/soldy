import type { IComponentSchema, ISchema, IPropertySchema } from './types'

function collectEvents<TProps extends Record<string, any>, TEvents extends Record<string, any>>(
	schema: IComponentSchema<TProps, TEvents>,
): (keyof TEvents & string)[] {
	const set = new Set<keyof TEvents & string>(schema.events ?? [])

	for (const prop of Object.values(schema.props ?? {})) {
		for (const event of prop?.triggers ?? []) {
			set.add(event)
		}
	}
	for (const prop of Object.values(schema.readonly ?? {})) {
		for (const event of prop?.triggers ?? []) {
			set.add(event)
		}
	}

	return [...set]
}

export function createSchema<
	TProps extends Record<string, any>,
	TEvents extends Record<string, any>,
>(
	schema: IComponentSchema<TProps, TEvents>,
): ISchema<TProps, TEvents> {
	return {
		...schema,
		events: collectEvents(schema),

		getAllProps(): Record<string, IPropertySchema<TEvents> | undefined> {
			return { ...this.props, ...this.readonly }
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
