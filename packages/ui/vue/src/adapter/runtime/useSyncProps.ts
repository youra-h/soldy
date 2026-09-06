import { ref, watch, onUnmounted, type Ref } from 'vue'
import type { IAccessor, TDescriptorInspector, IAccessorProp } from '@soldy/accessor'

export interface ISyncOptions {
	/** Коллбэк перед записью значения из Vue во внутренний Core */
	onInput?: (prop: IAccessorProp, value: any) => any
	/** Коллбэк при обновлении значения из Core во Vue */
	onOutput?: (prop: IAccessorProp, value: any) => void
}

export function useSyncProps(
	accessor: IAccessor,
	inspector: TDescriptorInspector,
	options: ISyncOptions = {},
) {
	const refs: Record<string, Ref<any>> = {}
	const cleanupFns: Array<() => void> = []

	// 1. Core → Vue (Output): создать refs, подписаться на триггеры
	function bindOutput(): () => void {
		const offs: Array<() => void> = []

		for (const prop of accessor.getProps(true) as IAccessorProp[]) {
			const rawTriggers = inspector.getRawTriggers(prop)

			// Свойства без триггеров — pass-through (ctrl)
			if (rawTriggers.length === 0) continue

			const propRef = ref(accessor.getValue(prop))

			refs[inspector.getExportPropName(prop)] = propRef

			const eventSource = accessor.getEventSource(prop)

			if (!eventSource) continue

			for (const rawTrigger of rawTriggers) {
				const handler = () => {
					// Свежесть значения — ответственность ядра: составные props
					// отдают снимок через valueOf() (см. TClasses, драйвер коллекции)
					// либо заменяются целиком (layout-плагины). Адаптер не угадывает.
					const value = accessor.getValue(prop)

					propRef.value = value
					options.onOutput?.(prop, value)
				}

				eventSource.on(rawTrigger, handler)
				offs.push(() => eventSource.off(rawTrigger, handler))
			}
		}

		cleanupFns.push(...offs)

		return () => offs.forEach((off) => off())
	}

	// 2. Vue → Core (Input): watch внешних props
	function bindInput(props: Record<string, any>): void {
		for (const prop of accessor.getProps(false) as IAccessorProp[]) {
			const formattedPropName = inspector.getExportPropName(prop)

			const stopWatch = watch(
				() => props[formattedPropName] ?? props[prop.name.name],
				(newVal) => {
					if (newVal === undefined) return

					accessor.setValue(prop, options.onInput ? options.onInput(prop, newVal) : newVal)
				},
			)

			cleanupFns.push(stopWatch)
		}
	}

	function cleanup(): void {
		cleanupFns.forEach((fn) => fn())
		cleanupFns.length = 0
	}

	onUnmounted(cleanup)

	return { refs, bindOutput, bindInput, cleanup }
}
