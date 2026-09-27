import type { IProgress } from '../../base/progress'

/**
 * CSS-переменные корня — и только они: доля готового числом от 0 до 1, без
 * единиц. Дорожку, дугу и бег рисует тема.
 */
export type TProgressSpinnerStyle = Record<`--${string}`, string>

export interface IProgressSpinner extends IProgress {
	/**
	 * `--s-progress-spinner-fraction` — доля готового числом, прижатая к 0–1.
	 * Пока кольцо бежит, переменной нет
	 */
	readonly fractionStyle: TProgressSpinnerStyle
}
