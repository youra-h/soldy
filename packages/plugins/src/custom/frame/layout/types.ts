import type { TPluginEvents } from '../../../base'

export type TFrameLayoutPluginEvents = TPluginEvents & {
	'change:styles': (styles: Record<string, string | number>) => void
}
