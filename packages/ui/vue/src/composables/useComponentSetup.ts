import type { SetupContext } from 'vue'
import type { IPluginBundle } from '@soldy/plugins'
import { useInstance } from './useInstance'
import { useBundle } from './useBundle'
import { useElementBinding } from './useElementBinding'
import { useInstanceBinding } from './useInstanceBinding'

export interface ISetupContext {
	props: Record<string, any>
	instance: any
	plugins: IPluginBundle
	emit: SetupContext['emit']
}

export interface IComponentSetupConfig {
	Ctor: new (options: any) => any
	createBundle: (plugins?: any) => IPluginBundle
	syncFn: (ctx: ISetupContext) => Record<string, any>
	extend?: () => Record<string, any>
}

export function useComponentSetup(config: IComponentSetupConfig) {
	return function setup(props: Record<string, any>, { emit }: SetupContext) {
		const instance = useInstance(config.Ctor, props)

		const plugins = useBundle(config.createBundle, props?.plugins)
		useInstanceBinding(plugins, instance)

		const rootElement = useElementBinding(plugins)

		const ctx: ISetupContext = { props, instance, plugins, emit }
		const state = config.syncFn(ctx)
		const extra = config.extend?.() ?? {}

		return { ctrl: instance, plugins, rootElement, ...state, ...extra }
	}
}
