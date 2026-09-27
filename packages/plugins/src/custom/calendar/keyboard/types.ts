import type { ICalendarFocusExtension } from '@soldy-ui/core'
import type { TPluginEvents } from '../../../base'

/**
 * Своих событий у плагина нет: результат нажатия виден и так — фокус сообщает
 * DOM, выбор и фокус сетки — расширения коллекции.
 */
export type TCalendarKeyboardPluginEvents = TPluginEvents

/** Что клавише нужно знать, кроме фокуса: направление письма и Shift. */
export type TCalendarMoveContext = {
	/** Правое-левое письмо: ←/→ меняются местами */
	rtl: boolean
	/** С Shift PageUp/PageDown листают год, а не месяц */
	shift: boolean
}

/** Переход фокуса сетки по клавише — команда расширения фокуса. */
export type TCalendarMove = (focus: ICalendarFocusExtension, context: TCalendarMoveContext) => void
