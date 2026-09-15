import type { TPluginEvents } from '../../base'

export type TSpinnerLayoutPluginEvents = TPluginEvents & {
	'change:styles': (styles: Record<string, string | number>) => void
}
