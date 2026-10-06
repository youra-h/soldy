import type { ISwipeable, TClasses, TSwipeableEvents } from '@soldy-ui/core'
import type { IListenable, TPluginEvents } from '../../../base'

/**
 * Своих событий у плагина нет: результат жеста виден через владельца —
 * `swiping` и закрытие (с причиной `swipe` у того, кто принимает запрос).
 * Второй путь к тем же фактам через события плагина разошёлся бы с первым.
 */
export type TSwipePluginEvents = TPluginEvents

/**
 * Владелец глазами плагина: смахиваемый слой (`ISwipeable`), его шина и
 * классы — по базовому классу плагин узнаёт полосу (`__handle`).
 *
 * Контракт, а не класс: тот же плагин стоит на выезжающей панели, поповере,
 * Select и DatePicker, общего предка у них нет — есть только общий контракт.
 */
export interface ISwipeOwner extends ISwipeable {
	readonly events: IListenable<TSwipeableEvents>
	readonly classes: TClasses
}

/** Ось, вдоль которой слой уходит жестом. */
export type TSwipeAxis = 'x' | 'y'

/**
 * Нажатие, которое ещё не стало жестом: жест начнётся, когда указатель уйдёт
 * от точки нажатия вдоль оси дальше порога.
 */
export type TSwipePress = {
	/** `pointerId` нажатия: чужие указатели его не двигают */
	pointer: number
	/** Точка нажатия в координатах окна */
	x: number
	y: number
}

/** Точка пути жеста — по ней считается скорость в конце. */
export type TSwipeSample = {
	/** Время события, мс */
	time: number
	/** Путь к краю от точки нажатия, px; назад от края — со знаком минус */
	distance: number
}

/** Жест, который ведёт плагин: от начала до отпускания. */
export type TSwipeGesture = {
	/** `pointerId` указателя жеста */
	pointer: number
	/** Ось жеста — на весь жест, вычислена в начале */
	axis: TSwipeAxis
	/**
	 * Куда по оси окна слой уходит: `1` — к большим координатам (вправо,
	 * вниз), `-1` — к меньшим. `start` и `end` — с учётом вычисленного
	 * направления письма.
	 */
	sign: 1 | -1
	/** Координата нажатия по оси */
	origin: number
	/** Размер панели по оси: доля пути считается от него */
	size: number
	/** Сдвиг панели к краю, px; за открытое положение — с сопротивлением, минус */
	offset: number
	/** Недавние точки пути — окно скорости */
	samples: TSwipeSample[]
	/** Инлайновые `user-select` панели до жеста — вернуть в конце */
	userSelect: readonly [property: string, value: string][]
}
