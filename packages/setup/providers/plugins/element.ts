import type { IAccessor, IAccessorProvider } from '@soldy/provider'
import type { IContractProp } from '@soldy/provider'
import type { TElementPlugin } from '@soldy/plugins'

export class TElementPluginAccessorProvider implements IAccessorProvider {
	constructor(private plugin: TElementPlugin) {}

	getAccessor(prop: IContractProp): IAccessor | undefined {
		if (prop.name !== 'element') return undefined

		const { plugin } = this

		return {
			get: () => plugin.element,
			set: (value: any) => {
				plugin.element = value
			},
			subscribe: (handler) => {
				const events = plugin.events as any

				events.on('ready', handler)
				events.on('removed', handler)

				return () => {
					events.off('ready', handler)
					events.off('removed', handler)
				}
			},
		}
	}
}
