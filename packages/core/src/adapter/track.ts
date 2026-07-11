/**
 * Оборачивает объект в Proxy и вызывает коллбэк при изменении указанного ключа.
 * Позволяет синхронизировать значения из props → instance без фреймворк-специфичных watch/useEffect.
 *
 * @param source - исходный объект (например, props из компонента)
 * @param key - ключ для отслеживания
 * @param callback - коллбэк, вызываемый при изменении значения
 * @returns исходный объект (перезаписывать результат не нужно, Proxy уже активен)
 *
 * @example
 * ```ts
 * track(props, 'rendered', (value) => {
 *   if (value !== undefined) instance.rendered = value
 * })
 * ```
 */
export function track<T extends object, K extends keyof T>(
	source: T,
	key: K,
	callback: (value: T[K]) => void,
): void {
	let prev = source[key]

	Object.defineProperty(source, key, {
		get() {
			return prev
		},
		set(value: T[K]) {
			if (value !== prev) {
				prev = value
				callback(value)
			}
		},
		configurable: true,
		enumerable: true,
	})
}
