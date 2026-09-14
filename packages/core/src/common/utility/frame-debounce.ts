/**
 * Возвращает debounced-версию функции fn, отложенную на следующий requestAnimationFrame.
 * Повторные вызовы до срабатывания rAF отменяют предыдущий — выполнится только последний.
 */
export function frameDebounce<TArgs extends unknown[]>(
	fn: (...args: TArgs) => void,
): (...args: TArgs) => void {
	let id: number | null = null

	return (...args: TArgs) => {
		if (id !== null) {
			cancelAnimationFrame(id)
		}

		id = requestAnimationFrame(() => {
			id = null
			fn(...args)
		})
	}
}
