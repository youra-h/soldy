/**
 * Цикл часов, как его называет Intl: `h11` — 0–11 и период суток, `h12` —
 * 1–12 и период, `h23` — 0–23, `h24` — 1–24.
 */
export type THourCycle = 'h11' | 'h12' | 'h23' | 'h24'

/** Ход часа в цикле и есть ли у цикла период суток. */
export type THourCycleRule = {
	readonly min: number
	readonly max: number
	readonly dayPeriod: boolean
}
