import type { TPluginEvents } from '../../../base'

export type TToastsLayoutPluginEvents = TPluginEvents & {
	'change:styles': (styles: Record<string, string | number>) => void
}
