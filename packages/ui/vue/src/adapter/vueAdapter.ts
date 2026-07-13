import { type Ref, customRef, watch } from 'vue'
import type { SetupContext } from 'vue'
import type { IPluginBundle } from '@soldy/plugins'
import { TPluginBundle } from '@soldy/plugins'
import { sync } from '@soldy/core/adapter'
import { useBundle } from '../composables/useBundle'
import { useElementBinding } from '../composables/useElementBinding'

export interface VueAdapterResult {
	refs: Record<string, Ref<any>>
	plugins: IPluginBundle
	rootElement: Ref<Element | null>
}

export function vueAdapter(
	contract: ReturnType<typeof import('@soldy/core/adapter').createContract>,
	instance: any,
	props: Record<string, any>,
	emit: SetupContext['emit'],
): VueAdapterResult {
	const refs: Record<string, Ref<any>> = {}
	const triggers: Record<string, () => void> = {}

	// 1. Плагины из контракта + переопределение через props.plugins
	const plugins = useBundle(
		() => {
			const bundle = new TPluginBundle()
			for (const Plugin of contract.plugins) {
				bundle.use(Plugin)
			}
			return bundle
		},
		props?.plugins,
	)

	// Привязка instance
	for (const Plugin of contract.plugins) {
		const plugin = plugins.get(Plugin)
		if (plugin && 'instance' in plugin) {
			plugin.instance = instance
		}
	}

	const rootElement = useElementBinding(plugins)

	// 2. Реактивные refs
	for (const name of Object.keys(contract.props)) {
		const propDef = contract.props[name]
		let trigger: () => void
		refs[name] = customRef((track, t) => {
			trigger = t
			return { get() { track(); return propDef.get(instance) }, set() {} }
		})
		triggers[name] = trigger!
	}

	// 3. Props → Core
	for (const name of Object.keys(contract.props)) {
		const propDef = contract.props[name]
		if (!propDef.set) continue
		watch(() => (props as any)[name], (value: any) => {
			if (value !== undefined) propDef.set!(instance, value)
		})
	}

	// 4. Синхронизация
	sync(contract, { instance, props, plugins }, {
		onPropertyChange(name, value) {
			emit(`change:${name}` as any, value)
			emit(`update:${name}` as any, value)
			triggers[name]?.()
		},
		onEvent(name, ...args) {
			emit(name as any, ...args)
		},
	})

	return { refs, plugins, rootElement }
}

