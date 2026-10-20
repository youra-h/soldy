import type { TPluginEvents } from '../../base'

export type TDragPluginEvents = TPluginEvents & {
	/**
	 * Свой жест начался: место взятого элемента в составе и его `uid` — тот
	 * же ключ, что у реестра bundles элементов (`TCollectionBundlesPlugin`)
	 */
	'drag:start': (payload: { index: number; uid: string | number }) => void
	/** Свой жест кончился */
	'drag:end': () => void
}
