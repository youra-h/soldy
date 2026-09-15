import type { TPluginEvents } from '../../../base'

export type TListScrollPluginEvents = TPluginEvents & {
	'change:scroll': () => void
}
