/**
 * @soldy/host — runtime/track.ts
 *
 * Односторонняя синхронизация: оборачивает свойство объекта в Object.defineProperty
 * и вызывает callback при каждом изменении значения.
 *
 * Используется для синхронизации props → instance в UI-компонентах.
 * В новой архитектуре будет заменён на TRuntime.setValue().
 */

export function track<T extends object, K extends keyof T>(
	source: T,
	key: K,
	callback: (value: T[K]) => void,
): void {
	let value = source[key]

	Object.defineProperty(source, key, {
		get() {
			return value
		},
		set(newValue) {
			if (newValue !== value) {
				value = newValue
				callback(newValue)
			}
		},
		enumerable: true,
		configurable: true,
	})
}
