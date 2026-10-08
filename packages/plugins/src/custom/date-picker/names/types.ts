import type { TPluginEvents } from '../../../base'

export type TDatePickerNamesPluginEvents = TPluginEvents & {
	/** change:start — имя поля начала диапазона сменилось вместе с локалью */
	'change:start': (value: string) => void
	/** change:end — имя поля конца диапазона сменилось вместе с локалью */
	'change:end': (value: string) => void
	/** change:confirm — текст кнопки «OK» сменился вместе с локалью */
	'change:confirm': (value: string) => void
	/** change:cancel — текст кнопки «Отмена» сменился вместе с локалью */
	'change:cancel': (value: string) => void
}
