import { type Ref, customRef, watch, onUnmounted } from 'vue'
import type { SetupContext } from 'vue'
import type { IComponent } from '@soldy/core'
import type { IPluginBundle } from '@soldy/plugins'
import type { ISchema, IAdapterPlatform } from '@soldy/schema'
import { createAdapter } from '@soldy/schema'
import { useElementBinding } from '../composables/useElementBinding'

export interface VueAdapterResult {
	/** Core-экземпляр компонента. */
	instance: IComponent<any, any>
	/** Реактивные refs для шаблона. */
	refs: Record<string, Ref<any>>
	/** Бандл плагинов. */
	plugins: IPluginBundle
	/** Привязка к корневому DOM-элементу. */
	rootElement: Ref<Element | null>
}

/**
 * Vue-адаптер: реализует {@link IAdapterPlatform} и делегирует
 * общую логику в {@link createAdapter}.
 */
export function vueAdapter(
	schema: ISchema<any, any>,
	props: Record<string, any>,
	emit: SetupContext['emit'],
): VueAdapterResult {
	// 1. Платформа Vue (создаётся до адаптера — нужна для createAdapter)
	const platform: IAdapterPlatform = {
		watchProp(name, onChange) {
			watch(
				() => (props as any)[name],
				(value: any) => onChange(value),
			)
		},

		emit(eventName, ...args) {
			emit(eventName as any, ...args)
		},

		onDispose(fn) {
			onUnmounted(fn)
		},

		createSignal(_get, _set) {
			// refs создаются в шаге 3, здесь не нужен
		},
	}

	// 2. Универсальный адаптер — создаёт instance через schema.Ctor
	const adapter = createAdapter(schema, props, platform, props?.plugins)

	// 3. Реактивные Vue-refs (после создания instance)
	const refs: Record<string, Ref<any>> = {}
	const triggers: Record<string, () => void> = {}

	const allProps = { ...schema.props, ...schema.computed }
	for (const name of Object.keys(allProps)) {
		const propDef = allProps[name]
		let trigger: () => void
		refs[name] = customRef((track, t) => {
			trigger = t
			return {
				get() {
					track()
					return propDef!.get(adapter.instance)
				},
				set() {},
			}
		})
		triggers[name] = trigger!
	}

	// 4. Обновление refs при изменениях из core
	adapter.binding.subscribe((change) => {
		if (change.type === 'property') {
			triggers[change.name]?.()
		}
	})

	// 5. Привязка DOM-элемента
	const rootElement = useElementBinding(adapter.bundle)

	return { instance: adapter.instance, refs, plugins: adapter.bundle, rootElement }
}

