/**
 * Отслеживает изменение значения по геттеру и вызывает коллбэк при изменении.
 * Возвращает функцию для ручного вызова проверки — каждый фреймворк вызывает её
 * по-своему (Vue через watch, React на каждом рендере).
 *
 * @param getter - функция, возвращающая текущее значение
 * @param callback - коллбэк, вызываемый при изменении значения
 * @returns функция для ручного запуска проверки
 *
 * @example
 * ```ts
 * const check = track(() => props.rendered, (value) => {
 *   instance.rendered = value
 * })
 * // Vue: watch(() => props.rendered, check)
 * // React: useEffect(() => { check() }, [props.rendered])
 * ```
 */
export function track<T>(
	getter: () => T,
	callback: (value: T) => void,
): () => void {
	let prev: T = getter()

	return () => {
		const current = getter()
		if (current !== prev) {
			prev = current
			callback(current)
		}
	}
}
