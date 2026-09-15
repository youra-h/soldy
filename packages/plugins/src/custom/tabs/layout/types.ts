import type { TPluginEvents } from '../../../base'

export type TTabsLayoutPluginEvents = TPluginEvents & {
	'change:layout': () => void
}
