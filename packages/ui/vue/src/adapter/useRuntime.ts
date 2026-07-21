/**
 * Vue-адаптер для @soldy/provider Runtime.
 *
 * Создаёт реактивные Vue-refs из Runtime и подписывается на изменения.
 * Синхронизирует внешние props в Runtime.
 */

import { ref, watch, onUnmounted, type Ref } from 'vue'
import type { TRuntime, TEmitPayload } from '@soldy/provider'

export function useRuntime(
	runtime: TRuntime,
	externalProps: Record<string, any>,
	emit?: (event: string, ...args: any[]) => void,
) {
	const refs: Record<string, Ref<any>> = {}

	// 1. Создаём реактивные переменные для всех свойств модели
	for (const prop of runtime.model.props) {
		refs[prop.name] = ref(runtime.getValue(prop.name))
	}

	const unsub = runtime.subscribe((payload: TEmitPayload) => {
		if (payload.type === 'property' && refs[payload.name] !== undefined) {
			refs[payload.name]!.value = payload.value
		}

		// Пробрасываем событие наружу (для Vue emit)
		if (emit) {
			if (payload.type === 'property') {
				emit(`change:${payload.name}`, payload.value)
				if (payload.writable) {
					emit(`update:${payload.name}`, payload.value)
				}
			} else {
				emit(payload.name as any, ...payload.args)
			}
		}
	})

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
		unsub()
		stopWatches.forEach((fn) => fn())
		runtime.dispose()
	})

	return {
		refs,
	}
}
