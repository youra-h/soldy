/**
 * Vue-адаптер: связывает дескриптор с Vue-реактивностью.
 *
 * Оборачивает framework-agnostic createAdapter из @soldy/setup,
 * добавляя Vue-специфичную логику: toRaw, реактивные refs, привязку DOM-элемента.
 *
 * Компоненту остаётся только передать дескриптор.
 */

import { toRaw } from 'vue'
import type { IComponentDescriptor } from '@soldy/setup'
import { createAdapter } from '@soldy/setup'
import { useRuntime } from './useRuntime'
import { useElementBinding } from './useElementBinding'

export function useAdapter(
	descriptor: IComponentDescriptor,
	props: Record<string, any>,
	emit?: (event: string, ...args: any[]) => void,
) {
	const { instance, bundle, runtime } = createAdapter(descriptor, {
		ctrl: props.ctrl ? toRaw(props.ctrl) : undefined,
		plugins: props.plugins,
		props,
	})

	const { refs } = useRuntime(runtime, props, emit)

	const rootElement = useElementBinding(bundle)

	return { ctrl: instance, plugins: bundle, rootElement, ...refs }
}
