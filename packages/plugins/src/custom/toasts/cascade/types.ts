import type { TPluginEvents } from '../../../base'

/**
 * Своих событий у плагина нет: шаг стопки виден через коллекцию — перестановку
 * сообщают `item:moved` и `change:order`, а фокус — DOM.
 */
export type TToastsCascadePluginEvents = TPluginEvents

/** Шаг стопки: `1` — передний уходит назад, `-1` — задний выходит вперёд. */
export type TCascadeStep = 1 | -1

/** Жест колеса: сколько прокрутили с его начала и был ли уже шаг. */
export type TWheelGesture = {
	/** Прокрутка с начала жеста, px со знаком оси окна */
	distance: number
	/** Шаг в этом жесте уже был: остаток жеста стопку не листает */
	stepped: boolean
}
