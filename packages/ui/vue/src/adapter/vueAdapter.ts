import { type Ref, customRef, watch, onUnmounted } from 'vue'
import type { SetupContext } from 'vue'
import type { IComponent } from '@soldy/core'
import type { IPluginBundle } from '@soldy/plugins'
import type { ISchema, IAdapterPlatform } from '@soldy/schema'
import { createAdapter, createRefs, bindProps } from '@soldy/schema'
import { useElementBinding } from '../composables/useElementBinding'

export interface VueAdapterResult {
	/** Core-экземпляр компонента. */
	ctrl: IComponent<any, any>
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
	emitComponent: SetupContext['emit'],
): VueAdapterResult {
	// 1. Платформа Vue
	const platform: IAdapterPlatform = {
		emit(notification) {
			if (notification.type === 'property') {
				emitComponent(`change:${notification.name}`, notification.value)

				if (notification.mutable) {
					emitComponent(`update:${notification.name}`, notification.value)
				}
			} else {
				emitComponent(notification.name as any, ...notification.args)
			}
		},

		onDispose(fn) {
			onUnmounted(fn)
		},
	}

	// 2. Универсальный адаптер — создаёт instance через schema.Ctor
	const adapter = createAdapter(schema, props, platform)

	// 2b. Явная синхронизация props → instance
	bindProps(schema, (name: string) => {
		watch(() => (props as any)[name], () => adapter.syncProp(name))
	})

	// 3. Реактивные Vue-refs
	const refs = createRefs(schema, adapter, (getter: () => any) => {
		let trigger: () => void

		const ref = customRef((track, t) => {
			trigger = t
			return {
				get() { track(); return getter() },
				set() {},
			}
		})

		return { ref, trigger: () => trigger() }
	})

	// 4. Привязка DOM-элемента
	const rootElement = useElementBinding(adapter.bundle)

	return { ctrl: adapter.instance, plugins: adapter.bundle, refs, rootElement }
}

