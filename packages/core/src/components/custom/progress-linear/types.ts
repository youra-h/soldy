import type {
	IProgress,
	IProgressProps,
	TProgressEvents,
	TProgressStates,
} from '../../base/progress'

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

export interface IProgressLinearProps extends IProgressProps {
	/** Ось полосы */
	orientation?: TProgressLinearOrientation
}

export type TProgressLinearStates = TProgressStates

export type TProgressLinearEvents = TProgressEvents & {
	/** change:orientation */
	'change:orientation': (value: TProgressLinearOrientation) => void
}

export interface IProgressLinear extends IProgress<
	IProgressLinearProps,
	TProgressLinearEvents,
	TProgressLinearStates
> {
	/** Ось полосы */
	orientation: TProgressLinearOrientation
	/**
	 * `--s-progress-linear-percent` — доля готового, прижатая к 0–100 %. Пока
	 * полоса бежит, переменной нет
	 */
	readonly percentStyle: TProgressLinearStyle
}
