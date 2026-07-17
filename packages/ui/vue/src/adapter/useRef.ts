import { customRef } from 'vue'

/**
 * Создаёт read-only Vue ref с ручным trigger-ом.
 * Используется в `createRefs` для реактивной привязки свойств core-компонента.
 */
export function useRef(getter: () => any): { ref: ReturnType<typeof customRef>; trigger: () => void } {
	let trigger: () => void

	const ref = customRef((track, t) => {
		trigger = t
		return {
			get() {
				track()
				return getter()
			},
			set() {},
		}
	})

	return { ref, trigger: () => trigger() }
}
