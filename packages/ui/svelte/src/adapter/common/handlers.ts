/**
 * Своё, затем обработчик потребителя — на одном событии разметки: обработчик
 * события в Svelte — атрибут, и потребительский из спреда занял бы место
 * своего. Как `chainHandler` у Solid.
 */
export function chainHandler<TEvent>(
	own: (event: TEvent) => void,
	consumer: ((event: TEvent) => unknown) | null | undefined,
): (event: TEvent) => void {
	return (event) => {
		own(event)
		consumer?.(event)
	}
}
