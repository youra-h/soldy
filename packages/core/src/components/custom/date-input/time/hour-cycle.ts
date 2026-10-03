import type { THourCycle, THourCycleRule } from './types'
import type { TDatePartLimits } from '../types'

/**
 * Циклы часов: ход часа, который видит пользователь, и период суток. У
 * 12-часового цикла час — в своей половине суток, её выбирает период.
 */
const HOUR_CYCLES: Readonly<Record<THourCycle, THourCycleRule>> = {
	h11: { min: 0, max: 11, dayPeriod: true },
	h12: { min: 1, max: 12, dayPeriod: true },
	h23: { min: 0, max: 23, dayPeriod: false },
	h24: { min: 1, max: 24, dayPeriod: false },
}

/** Часов в половине суток — шаг периода. */
export const HALF_DAY = 12

/** Ход часа, который видит пользователь, в цикле: у `h12` — 1–12, у `h23` — 0–23. */
export function hourLimits(cycle: THourCycle): TDatePartLimits {
	const { min, max } = HOUR_CYCLES[cycle]

	return { min, max }
}

/** Есть ли у цикла период суток — у 12-часового есть. */
export function hasDayPeriod(cycle: THourCycle): boolean {
	return HOUR_CYCLES[cycle].dayPeriod
}

/** Час, который видит пользователь в цикле, по часу суток (0–23): 14 у `h12` — 2, 0 — 12. */
export function hourInCycle(hour: number, cycle: THourCycle): number {
	const { min, max } = HOUR_CYCLES[cycle]
	const size = max - min + 1

	return ((((hour - min) % size) + size) % size) + min
}

/**
 * Час суток (0–23) по часу, который видит пользователь в цикле, и периоду
 * суток: 0 — до полудня, 1 — после. Период сдвигает час на половину суток, а у
 * 24-часового цикла его нет: 12 у `h12` до полудня — 0, после — 12; 24 у `h24`
 * — 0.
 */
export function hourOfDay(shown: number, cycle: THourCycle, period: number): number {
	const { min, max, dayPeriod } = HOUR_CYCLES[cycle]
	const size = max - min + 1

	return (shown % size) + (dayPeriod ? period * HALF_DAY : 0)
}
