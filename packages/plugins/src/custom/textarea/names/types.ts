import type { TPluginEvents } from '../../../base'

export type TTextareaNamesPluginEvents = TPluginEvents & {
	/**
	 * change:counter — текст счётчика сменился: набранное, предел или локаль
	 */
	'change:counter': (value: string) => void
}
