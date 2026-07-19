/**
 * Vue-адаптер для @soldy/provider Runtime.
 *
 * Создаёт реактивные Vue-refs из Runtime и подписывается на изменения.
 * Синхронизирует внешние props в Runtime.
 */

import { ref, watch, onUnmounted, type Ref } from 'vue'
import type { TRuntime, TEmitPayload } from '@soldy/provider'

export function useComponentRuntime(
	runtime: TRuntime,
	externalProps: Record<string, any>,
	emit?: (event: string, ...args: any[]) => void,
) {
	const refs: Record<string, Ref<any>> = {}

	// 1. Создаём реактивные переменные для всех свойств модели (кроме event)
	for (const prop of runtime.model.props) {
		if (prop.kind !== 'event') {
			refs[prop.name] = ref(runtime.getValue(prop.name))
		}
	}

	// 2. Подписываемся на изменения из Runtime
	const unsub = runtime.subscribe((payload: TEmitPayload) => {
		if (payload.type === 'property' && refs[payload.name] !== undefined) {
			refs[payload.name]!.value = payload.value
		}

		// Пробрасываем событие наружу (для Vue emit)
		if (emit) {
			if (payload.type === 'property') {
				emit(`change:${payload.name}`, payload.value)
				if (payload.mutable) {
					emit(`update:${payload.name}`, payload.value)
				}
			} else {
				emit(payload.name as any, ...payload.args)
			}
		}
	})

	// 3. Синхронизация внешних props → Runtime (только при изменениях)
	const stopWatch = watch(
		() => ({ ...externalProps }),
		(newProps) => {
			for (const key of Object.keys(newProps)) {
				if (
					runtime.model.props.some(
						m => m.name === key && m.kind !== 'event',
					)
				) {
					runtime.setValue(key, (newProps as any)[key])
				}
			}
		},
		{ deep: true },
	)

	// 4. Генерация emits для Vue (статическое описание)
	const emits: string[] = [...runtime.model.events]
	for (const prop of runtime.model.props) {
		if (prop.kind !== 'event') {
			emits.push(`change:${prop.name}`)
		}
	}

	// 5. Cleanup
	onUnmounted(() => {
		unsub()
		stopWatch()
		runtime.dispose()
	})

	return {
		refs,
		emits,
	}
}
