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

/**
 * Отрезок по строке: левый и правый край в координатах окна браузера — как их
 * отдаёт `getBoundingClientRect()`.
 *
 * Края физические. Где у строки начало, решает направление письма, а не
 * отрезок: в RTL начало — правый край.
 */
export type TInlineSpan = {
	left: number
	right: number
}

/**
 * Что нужно доводке элемента под фокусом (`nearestShift`) — всё отрезками по
 * строке.
 */
export type TNearestShiftOptions = {
	/**
	 * Окно области прокрутки — паддинг-бокс области без `scroll-padding` с
	 * каждой стороны (`scrollWindowOf`). Окно задаёт тема: у ленты это её
	 * чистая часть между подсказками, у ряда тегов — место с запасом под
	 * кольцо фокуса.
	 */
	scrollWindow: TInlineSpan
	/** Элемент под фокусом. */
	focused: TInlineSpan
	/**
	 * Элемент области, в котором он лежит, — прямой ребёнок области
	 * (`itemOf`). Без него в окно доводится один элемент под фокусом.
	 */
	item?: TInlineSpan
}
