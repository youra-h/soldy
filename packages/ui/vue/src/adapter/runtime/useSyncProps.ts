import { ref, watch, onUnmounted, type Ref } from 'vue'
import type { IAccessor, TDescriptorInspector, IAccessorProp } from '@soldy/accessor'

export interface ISyncOptions {
	/** Коллбэк перед записью значения из Vue во внутренний Core */
	onInput?: (prop: IAccessorProp, value: any) => any
	/** Коллбэк при обновлении значения из Core во Vue */
	onOutput?: (prop: IAccessorProp, value: any) => void
}

/**
 * Фабрика реактивности: связывает Core и Vue.
 *
 * Принимает accessor + inspector (всего 2 параметра),
 * возвращает { refs, bindOutput, bindInput, cleanup }.
 *
 * - bindOutput(): создаёт refs с начальными значениями и подписывается на триггеры
 * - bindInput(props): вешает watchers на внешние props
 * - cleanup(): снимает все watchers (вызывается автоматически на onUnmounted)
 */
export function useSyncProps(
	accessor: IAccessor,
	inspector: TDescriptorInspector,
	options: ISyncOptions = {},
) {
	const refs: Record<string, Ref<any>> = {}
	const cleanupFns: (() => void)[] = []

	// 1. Core → Vue (Output): создать refs, подписаться на триггеры
	function bindOutput() {
		for (const prop of accessor.getProps(true) as IAccessorProp[]) {
			const rawTriggers = inspector.getRawTriggers(prop)

			// Пропускаем свойства без триггеров — pass-through (ctrl, plugins)
			if (rawTriggers.length === 0) continue

			const formattedPropName = inspector.getExportPropName(prop)
			const initialValue = accessor.getValue(prop)

			const propRef = ref(initialValue)

			refs[formattedPropName] = propRef

			const eventSource = accessor.getEventSource(prop)

			if (eventSource) {
				for (const rawTrigger of rawTriggers) {
					eventSource.on(rawTrigger, () => {
						const val = accessor.getValue(prop)

						// Плагины и коллекции мутируют значения in-place (объект
						// _styles, driver-прокси items/selected и т.д.) и эмитят
						// change:*. accessor.getValue() возвращает ссылку на тот же
						// объект — если присвоить ту же ссылку в ref.value, Vue
						// считает oldValue === newValue и НЕ триггерит ререндер.
						// Поэтому клонируем plain-объекты и array-like значения
						// (не Vue-компоненты).
						const isArrayLike =
							val != null &&
							typeof val === 'object' &&
							typeof val.length === 'number' &&
							typeof val[Symbol.iterator] === 'function'

						const isPlainObj =
							typeof val === 'object' &&
							val !== null &&
							val.constructor === Object &&
							!('__v_skip' in val) &&
							!('render' in val)

						propRef.value = isArrayLike
							? Array.from(val)
							: isPlainObj
								? { ...val }
								: val

						options.onOutput?.(prop, val)
					})
				}
			}
		}
	}

	// 2. Vue → Core (Input): watch внешних props
	function bindInput(props: Record<string, any>) {
		for (const prop of accessor.getProps(false) as IAccessorProp[]) {
			const formattedPropName = inspector.getExportPropName(prop)

			const stopWatch = watch(
				() => props[formattedPropName] ?? props[prop.name.name],
				(newVal) => {
					if (newVal !== undefined) {
						const valueToSet = options.onInput ? options.onInput(prop, newVal) : newVal

						accessor.setValue(prop, valueToSet)
					}
				},
			)
			cleanupFns.push(stopWatch)
		}
	}

	function cleanup() {
		cleanupFns.forEach((fn) => fn())
	}

	onUnmounted(cleanup)

	return {
		refs,
		bindOutput,
		bindInput,
		cleanup,
	}
}
