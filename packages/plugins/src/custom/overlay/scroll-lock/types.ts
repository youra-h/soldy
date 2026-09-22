import type { TPluginEvents } from '../../../base'
import type { IOverlayOpenOptions } from '../types'

export interface IScrollLockPluginOptions extends IOverlayOpenOptions {
	/**
	 * Заперта ли прокрутка сразу после установки.
	 *
	 * Обычно этого не задают: плагин сам следит за открытостью владельца
	 * (`property`). Но, как и у `TDismissPlugin`, замок можно вести и вручную
	 * — `property: null` и запись в `enabled`.
	 */
	enabled?: boolean
}

export type TScrollLockPluginEvents = TPluginEvents & {
	/** change:enabled */
	'change:enabled': (value: boolean) => void
}
