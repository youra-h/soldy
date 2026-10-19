import type { TPluginEvents } from '../../../base'
import type { TNumberInputButton } from '../types'

/**
 * Своих событий у плагина нет: шаги видны в значении ядра, удержание — в
 * `data-pressed` набора кнопки, его конец — событием ядра `commit`.
 */
export type TNumberInputStepperPluginEvents = TPluginEvents

/** Опции установки плагина кнопок шага. */
export interface INumberInputStepperPluginOptions {
	/** Сколько держать кнопку до повтора шага, мс; по умолчанию 400 */
	repeatDelay?: number
	/** Шаг повтора, пока кнопку держат, мс; по умолчанию 60 */
	repeatInterval?: number
}

/** Удержание кнопки шага: какую держат и таймер следующего шага. */
export type TNumberInputHold = {
	readonly button: TNumberInputButton
	timer: ReturnType<typeof setTimeout>
}
