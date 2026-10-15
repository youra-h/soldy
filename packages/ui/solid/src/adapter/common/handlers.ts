/**
 * Своё, затем обработчик потребителя — на одном событии разметки.
 *
 * Во Vue слушатели одного события складываются сами: `@click` компонента и
 * `@click` потребителя срабатывают оба. В Solid событие разметки — проп, и
 * обработчик потребителя из его атрибутов занял бы место своего. Поэтому
 * разметка склеивает их сама: клик строки элемента коллекции сначала выбирает
 * его, потом доходит до `onClick` потребителя, `change` радио — так же с
 * `onChange`. Как `onClick` у React и `onclick` у Svelte.
 *
 * Обработчик в разметке Solid бывает и парой `[handler, data]`: Solid зовёт
 * её `handler(data, event)`, и склейка зовёт так же.
 */

/**
 * Обработчик события в любой форме, которую принимает разметка Solid:
 * функция или пара `[handler, data]` (`JSX.EventHandlerUnion`).
 */
export type THandlerUnion<TEvent> =
	| ((event: TEvent) => void)
	| { readonly 0: (data: unknown, event: TEvent) => void; readonly 1: unknown }

/** Обработчик, который зовёт `own`, затем обработчик потребителя `consumer`. */
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
