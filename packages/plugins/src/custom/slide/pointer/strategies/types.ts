/**
 * Что стратегия щелчка знает о жесте. Всё — доли хода ручки в направлении
 * роста, как у владельца (`ISlidable`): 0 — у `min`, 1 — у `max`.
 */
export type TSlideSnapContext = {
	/** Точки щелчка — доли меток по возрастанию, без повторов */
	readonly points: readonly number[]
	/** Радиус щелчка — доля хода: радиус в px на длину дорожки */
	readonly radius: number
	/**
	 * Где ручка в начале жеста: у захвата — где она стоит, у нажатия мимо
	 * ручек — точка нажатия
	 */
	readonly anchor: number
	/** Сколько мс ручка стоит на пересечённой метке — у задержки (`hold`) */
	readonly holdDelay: number
}

/**
 * Стратегия щелчка — одна на режим (`TSlideSnap`) и новая на каждый жест:
 * у плато и задержки есть память жеста.
 *
 * Стратегия видит ручку, а не указатель. На входе — куда встала бы ручка без
 * щелчка: указатель со смещением захвата. На выходе — куда ей встать. Не
 * вмешалась — отдаёт вход как есть.
 */
export interface ISlideSnapStrategy {
	/**
	 * Когда стратегии снова нужна ручка, хотя указатель стоит на месте, — конец
	 * стоянки на метке, мс по часам `performance.now()`. Ждать нечего —
	 * `undefined`
	 */
	readonly wakeAt: number | undefined
	/**
	 * Куда встать ручке. `target` — где она была бы без щелчка, `now` — время,
	 * мс по часам `performance.now()`
	 */
	follow(target: number, now: number): number
	/**
	 * Ручку отпустили там, где без щелчка она стояла бы в `target`: куда её
	 * довести. Оставить, где отпустили, — `undefined`
	 */
	release(target: number): number | undefined
}

/** Конструктор стратегии: плагин заводит по нему стратегию на каждый жест. */
export type TSlideSnapStrategyCtor = new (context: TSlideSnapContext) => ISlideSnapStrategy

/**
 * Узел ломаной плато: где ручка была бы без щелчка → где она встаёт. Между
 * узлами — прямая, на плато у двух соседних узлов одно и то же «встаёт».
 */
export type TPlateauKnot = readonly [target: number, placed: number]

/** Стоянка ручки на метке — у задержки. */
export type THoldStop = {
	/** Метка, на которой стоит ручка */
	readonly point: number
	/** До какого времени, мс по часам `performance.now()` */
	readonly until: number
}
