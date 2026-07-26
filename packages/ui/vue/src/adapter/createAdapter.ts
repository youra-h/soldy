/**
 * Центральная фабрика Vue-адаптера: createVueAdapter.
 *
 * Собирает useProps, useEmits, useRuntime и useAdapter в единый «запечённый»
 * контекст с фиксированной стратегией именования.
 *
 * useProps / useEmits теперь живут в helpers.ts и используют единый createInspector.
 * createVueAdapter делегирует туда же.
 *
 * Для нового кода используйте createAdapterContext + useVue из @soldy/setup и ./useVue.
 * Для компонентов-коллекций — createAdapterContext + .use(withCollection).
 */

import { toRaw, ref, watch, onUnmounted } from 'vue'
import type { IComponentDescriptor } from '@soldy/setup'
import { createAdapter, bindPlugins } from '@soldy/setup'
import type { TComponentAccessor, INamingStrategy } from '@soldy/accessor'
import { createInspector } from './createInspector'
import { useSyncProps } from './runtime/useSyncProps'
import { useSyncEvents } from './runtime/useSyncEvents'

export function createVueAdapter(naming: INamingStrategy = undefined as any) {
	// --- USE RUNTIME ---
	function useRuntime(
		accessor: TComponentAccessor,
		externalProps: Record<string, any>,
		emit?: (event: string, ...args: any[]) => void,
	) {
		const inspector = createInspector(accessor, naming)

		const { refs, bindOutput, bindInput } = useSyncProps(accessor, inspector)

		// Связать Core → Vue (Output)
		bindOutput()
		// Связать Vue → Core (Input)
		bindInput(externalProps)

		// Связать события Core → Vue (Emit)
		useSyncEvents(accessor, inspector, emit)

		return { refs }
	}

	// --- USE ADAPTER ---
	function useAdapter(
		descriptor: IComponentDescriptor,
		props: Record<string, any>,
		emit?: (event: string, ...args: any[]) => void,
	) {
		const { instance, bundle, accessor } = createAdapter(descriptor, {
			ctrl: props.ctrl ? toRaw(props.ctrl) : undefined,
			plugins: props.plugins,
			props,
		})

		const { refs } = useRuntime(accessor, props, emit)

		const { bindElement } = bindPlugins(bundle, instance)

		const rootElement = ref<Element | null>(null)

		watch(rootElement, (el) => bindElement(el ?? null), { flush: 'post' })

		onUnmounted(() => {
			bindElement(null)
		})

		return { ctrl: instance, plugins: bundle, rootElement, ...refs }
	}

	return { useRuntime, useAdapter }
}

// Предзапечённые экземпляры с vueNaming по умолчанию
export const { useRuntime, useAdapter } = createVueAdapter()
