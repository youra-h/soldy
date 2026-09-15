import type { TPluginEvents } from '../../base'

export type TDragPluginEvents = TPluginEvents & {
	'drag:start': (payload: { index: number; uid: number }) => void
	'drag:end': () => void
}
