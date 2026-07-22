/**
 * Vue-адаптер для @soldy/provider Runtime.
 *
 * Создаёт реактивные Vue-refs из Runtime и подписывается на изменения.
 * Синхронизирует внешние props в Runtime.
 */

import { ref, watch, onUnmounted, type Ref } from 'vue'
import type { TRuntime, TEmitPayload } from '@soldy/provider'
import { useRefs } from './useRefs'

export function useRuntime(
	runtime: TRuntime,
	externalProps: Record<string, any>,
	emit?: (event: string, ...args: any[]) => void,
) {
	const refs: Record<string, Ref<any>> = {}

	// 1. Создаём реактивные переменные для всех свойств модели
	useRefs()

	// 3. Синхронизация внешних props → Runtime
	const stopWatches: (() => void)[] = []

	for (const prop of runtime.model.props) {
		if (prop.protected) continue

		stopWatches.push(
			watch(
				() => externalProps[prop.name],
				(newVal) => {
					if (newVal !== undefined) {
						runtime.setValue(prop.name, newVal)
					}
				},
			),
		)
	}

	// 4. Cleanup
	onUnmounted(() => {
		stopWatches.forEach((fn) => fn())
		runtime.dispose()
	})

	return {
		refs,
	}
}
