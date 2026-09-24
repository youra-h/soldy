import type { TPluginEvents } from '../../../base'

export type TDialogLayoutPluginEvents = TPluginEvents & {
	'change:styles': (styles: Record<string, string | number>) => void
	'change:backdropStyles': (styles: Record<string, string | number>) => void
}
