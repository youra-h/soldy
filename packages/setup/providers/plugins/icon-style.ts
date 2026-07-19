import type { IAccessor, IAccessorProvider } from '@soldy/provider'
import type { IContractProp } from '@soldy/provider'
import type { TIconStylePlugin } from '@soldy/plugins'

export class TIconStylePluginAccessorProvider implements IAccessorProvider {
	constructor(private plugin: TIconStylePlugin) {}

	getAccessor(prop: IContractProp): IAccessor | undefined {
		if (prop.name !== 'styles') return undefined

		const { plugin } = this

		return {
			get: () => plugin.styles,
			subscribe: (handler) => {
				const events = plugin.events as any

				events.on('change:styles', handler)

				return () => events.off('change:styles', handler)
			},
		}
	}
}
