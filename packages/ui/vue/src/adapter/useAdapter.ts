/**
 * Vue-адаптер: связывает дескриптор с Vue-реактивностью.
 *
 * Оборачивает framework-agnostic createAdapter + bindPlugins из @soldy/setup,
 * добавляя Vue-специфичную логику: toRaw, реактивные refs, привязку DOM-элемента.
 */

import { toRaw, ref, watch, onUnmounted } from 'vue'
import type { IComponentDescriptor } from '@soldy/setup'
import { createAdapter, bindPlugins } from '@soldy/setup'
import { useRuntime } from './useRuntime'

export function useAdapter(
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

	onUnmounted(() => bindElement(null))

	return { ctrl: instance, plugins: bundle, rootElement, ...refs }
}
