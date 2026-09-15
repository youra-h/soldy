import type { TPluginEvents } from '../../base'

export type TIconLayoutPluginEvents = TPluginEvents & {
	'change:styles': (styles: Record<string, string | number>) => void
}
