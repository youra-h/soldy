import type { TPluginEvents } from '../../base/types'

export type TElementServiceEvents = TPluginEvents & {
	ready: (element: HTMLElement) => void
	removed: () => void
}
