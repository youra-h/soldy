import type {
	IStylable,
	IStylableProps,
	TStylableEvents,
	TStylableStates,
} from '../../base/stylable'

/**
 * CSS-переменные корня — и только они: доля готового процентом от `min` до
 * `max`, с `%`. Дорожку, заливку и бег раскладывает тема, логическими
 * свойствами, поэтому RTL разметке знать не нужно.
 */
export type TProgressLinearStyle = Record<`--${string}`, string>

export interface IProgressLinearProps extends IStylableProps {
	/**
	 * Сколько готово — число на шкале от `min` до `max`. `null` — доля
	 * неизвестна, и полоса бежит. Бег — это `null`, а не флаг рядом со
	 * значением: пара «значение + флаг» допускала бы бег с долей.
	 */
	value?: number | null
	/** Начало шкалы */
	min?: number
	/** Конец шкалы */
	max?: number
}

export type TProgressLinearStates = TStylableStates

export type TProgressLinearEvents = TStylableEvents & {
	/** change:value */
	'change:value': (value: number | null) => void
	/** change:min */
	'change:min': (value: number) => void
	/** change:max */
	'change:max': (value: number) => void
}

export interface IProgressLinear extends IStylable<
	IProgressLinearProps,
	TProgressLinearEvents,
	TProgressLinearStates
> {
	/** Сколько готово; `null` — доля неизвестна */
	value: number | null
	/** Начало шкалы */
	min: number
	/** Конец шкалы */
	max: number
	/**
	 * `--s-progress-linear-percent` — доля готового, прижатая к 0–100 %. Пока
	 * доля неизвестна, переменной нет
	 */
	readonly percentStyle: TProgressLinearStyle
}
