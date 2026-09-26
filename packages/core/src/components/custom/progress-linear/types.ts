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

/**
 * Ось полосы: `horizontal` — вдоль строки, от её начала; `vertical` — снизу
 * вверх, как вертикальный Slider.
 */
export type TProgressLinearOrientation = 'horizontal' | 'vertical'

export interface IProgressLinearProps extends IStylableProps {
	/** Сколько готово — число на шкале от `min` до `max` */
	value?: number
	/** Начало шкалы */
	min?: number
	/** Конец шкалы */
	max?: number
	/**
	 * Доля неизвестна — полоса бежит. Флаг главнее значения, как у CheckBox:
	 * пока он стоит, доли и `aria-valuenow` нет, а `value` хранится и
	 * вернётся, когда бег снимут.
	 */
	indeterminate?: boolean
	/** Ось полосы */
	orientation?: TProgressLinearOrientation
}

export type TProgressLinearStates = TStylableStates

export type TProgressLinearEvents = TStylableEvents & {
	/** change:value */
	'change:value': (value: number) => void
	/** change:min */
	'change:min': (value: number) => void
	/** change:max */
	'change:max': (value: number) => void
	/** change:indeterminate */
	'change:indeterminate': (value: boolean) => void
	/** change:orientation */
	'change:orientation': (value: TProgressLinearOrientation) => void
}

export interface IProgressLinear extends IStylable<
	IProgressLinearProps,
	TProgressLinearEvents,
	TProgressLinearStates
> {
	/** Сколько готово */
	value: number
	/** Начало шкалы */
	min: number
	/** Конец шкалы */
	max: number
	/** Доля неизвестна — полоса бежит, `value` при этом хранится */
	indeterminate: boolean
	/** Ось полосы */
	orientation: TProgressLinearOrientation
	/**
	 * `--s-progress-linear-percent` — доля готового, прижатая к 0–100 %. Пока
	 * полоса бежит, переменной нет
	 */
	readonly percentStyle: TProgressLinearStyle
}
