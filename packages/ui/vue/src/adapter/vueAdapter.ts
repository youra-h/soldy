import { type Ref, customRef, watch, onUnmounted } from 'vue'
import type { SetupContext } from 'vue'
import type { IComponent } from '@soldy/core'
import type { IPluginBundle } from '@soldy/plugins'
import type { ISchema } from '@soldy/schema'
import { TPluginBundle } from '@soldy/plugins'
import { sync } from '@soldy/schema'
import { useBundle } from '../composables/useBundle'
import { useElementBinding } from '../composables/useElementBinding'

export interface VueAdapterResult {
	refs: Record<string, Ref<any>>
	plugins: IPluginBundle
	rootElement: Ref<Element | null>
}

export function vueAdapter(
	contract: ISchema<any, any>,
	instance: IComponent<any, any>,
	props: Record<string, any>,
	emit: SetupContext['emit'],
): VueAdapterResult {
	const refs: Record<string, Ref<any>> = {}
	const triggers: Record<string, () => void> = {}

	// 1. Плагины (отдельно от sync — это ответственность адаптера)
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

	for (const Plugin of contract.plugins) {
		const plugin = plugins.get(Plugin)
		if (plugin && 'instance' in plugin) {
			plugin.instance = instance
		}
	}

	const rootElement = useElementBinding(plugins)

	// 2. Реактивные refs — props + computed
	const allProps = { ...contract.props, ...contract.computed }
	for (const name of Object.keys(allProps)) {
		const propDef = allProps[name]
		let trigger: () => void
		refs[name] = customRef((track, t) => {
			trigger = t
			return { get() { track(); return propDef!.get(instance) }, set() {} }
		})
		triggers[name] = trigger!
	}

	// 3. Props → Core (только для props, не computed)
	for (const name of Object.keys(contract.props)) {
		const propDef = contract.props[name]
		if (!propDef?.set) continue
		watch(() => (props as any)[name], (value: any) => {
			if (value !== undefined) propDef.set!(instance, value)
		})
	}

	// 4. Синхронизация через subscribe
	const binding = sync(contract, instance)

	binding.subscribe((change) => {
		if (change.type === 'property') {
			emit(`change:${change.name}` as any, change.value)
			emit(`update:${change.name}` as any, change.value)
			triggers[change.name]?.()
		} else {
			emit(change.name as any, ...change.args)
		}
	})

	onUnmounted(() => binding.dispose())

	return { refs, plugins, rootElement }
}

