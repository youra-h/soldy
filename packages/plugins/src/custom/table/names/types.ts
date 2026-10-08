import type { TPluginEvents } from '../../../base'

export type TTableNamesPluginEvents = TPluginEvents & {
	/** change:selectAll — имя чекбокса «выбрать все» сменилось вместе с локалью */
	'change:selectAll': (value: string) => void
}
