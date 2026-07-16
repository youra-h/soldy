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
			const set = new Set<keyof TEvents & string>(this.events ?? [])

			for (const event of this.getTriggers().keys()) {
				set.add(event)
			}

			return [...set]
		},

		getTriggers(): Map<string, string[]> {
			const map = new Map<string, string[]>()

			for (const [propName, prop] of Object.entries(this.getAllProps())) {
				if (!prop?.triggers) continue

				for (const event of prop.triggers) {
					if (!map.has(event)) map.set(event, [])
					map.get(event)!.push(propName)
				}
			}

			return map
		},

		getEmits(): { events: string[]; mutable: string[]; readonly: string[] } {
			const events = [...(this.events ?? [])]
			const mutable: string[] = []
			const readonly: string[] = []

			for (const [name, prop] of Object.entries(this.props)) {
				if (prop?.set) mutable.push(name)
			}
			for (const name of Object.keys(this.readonly ?? {})) {
				readonly.push(name)
			}

			return { events, mutable, readonly }
		},

		extend<TExtProps extends Record<string, any>, TExtEvents extends Record<string, any>>(
			extension: Partial<IComponentSchema<TExtProps, TExtEvents>>,
		) {
			return createSchema<TProps & TExtProps, TEvents & TExtEvents>({
				props: { ...schema.props, ...extension.props } as any,
				readonly: { ...schema.readonly, ...extension.readonly } as any,
				events: [...(schema.events ?? []), ...(extension.events ?? [])] as any,
				plugins: [...(schema.plugins ?? []), ...(extension.plugins ?? [])],
				Ctor: (extension.Ctor ?? schema.Ctor) as any,
			})
		},
	}
}
