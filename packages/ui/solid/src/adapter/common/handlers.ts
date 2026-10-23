/**
 * Своё, затем обработчик потребителя — на одном событии разметки: в Solid
 * событие — проп, и обработчик потребителя занял бы место своего.
 */

/** Обработчик в любой форме разметки Solid: функция или пара `[handler, data]`. */
export type THandlerUnion<TEvent> =
	| ((event: TEvent) => void)
	| { readonly 0: (data: unknown, event: TEvent) => void; readonly 1: unknown }

export function chainHandler<TEvent>(
	own: (event: TEvent) => void,
	consumer: THandlerUnion<TEvent> | undefined,
): (event: TEvent) => void {
	return (event) => {
		own(event)

		if (typeof consumer === 'function') consumer(event)
		else consumer?.[0](consumer[1], event)
	}
}
