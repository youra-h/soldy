import type { TPluginEvents } from '../../../base'

export type TTagsNamesPluginEvents = TPluginEvents & {
	/** change:more — имя кнопки «…» сменилось вместе с локалью */
	'change:more': (value: string) => void
}
