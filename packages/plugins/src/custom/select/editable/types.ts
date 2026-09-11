import type { TPluginEvents } from '../../../base'

export type TEditablePluginEvents = TPluginEvents & {
	/** change:query — сменился текст, набранный в поле */
	'change:query': (value: string) => void
}
