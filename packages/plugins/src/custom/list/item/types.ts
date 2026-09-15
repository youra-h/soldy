import type { TPluginEvents } from '../../../base'

export type TListItemPluginEvents = TPluginEvents & {
	'change:highlighted': (value: boolean) => void
}
