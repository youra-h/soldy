import type { TPluginEvents } from '../../base'

export type TSkeletonLayoutPluginEvents = TPluginEvents & {
	'change:styles': (styles: Record<string, string | number>) => void
}
