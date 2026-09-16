/**
 * Узел как источник DOM-событий — с полной их картой.
 *
 * `Element.addEventListener` типизирован картой `ElementEventMap`, а в ней
 * два fullscreen-события: полную карту (`GlobalEventHandlersEventMap`)
 * lib.dom даёт только `HTMLElement` и `SVGElement`. Узел плагину приходит как
 * `Element` (см. `TElementPlugin`), и неточность тут в карте, а не в узле: на
 * любом элементе `click` придёт `MouseEvent`, `keydown` — `KeyboardEvent`.
 *
 * Поэтому пробел закрывается объявлением, а не приведением обработчика к
 * `EventListener` и не сужением узла: методы интерфейса сверяются бивариантно,
 * и `Element` подходит под него как есть. Сужать узел `instanceof`-ом нельзя —
 * ветка никогда не ложна, зато на неучтённом виде узла слушатель молча не
 * повесился бы.
 *
 * Плагину, который от узла больше ничего не хочет, этот тип и объявляют полем
 * — как `TAnchorPlugin` объявляет якорь `Element`. Кому нужен и сам узел,
 * берёт локальный псевдоним на время подписки.
 */
export interface IDomEventTarget {
	addEventListener<K extends keyof GlobalEventHandlersEventMap>(
		type: K,
		listener: (event: GlobalEventHandlersEventMap[K]) => void,
		options?: boolean | AddEventListenerOptions,
	): void

	removeEventListener<K extends keyof GlobalEventHandlersEventMap>(
		type: K,
		listener: (event: GlobalEventHandlersEventMap[K]) => void,
		options?: boolean | EventListenerOptions,
	): void
}
