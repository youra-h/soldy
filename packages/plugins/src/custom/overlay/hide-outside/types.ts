import type { TPluginEvents } from '../../../base'
import type { IOverlayOpenOptions } from '../types'

export interface IHideOutsidePluginOptions extends IOverlayOpenOptions {
	/**
	 * Спрятан ли фон сразу после установки.
	 *
	 * Обычно этого не задают: плагин сам следит за открытостью владельца
	 * (`property`). Но, как и у `TScrollLockPlugin`, пометку можно вести и
	 * вручную — `property: null` и запись в `enabled`.
	 */
	enabled?: boolean
}

export type THideOutsidePluginEvents = TPluginEvents & {
	/** change:enabled */
	'change:enabled': (value: boolean) => void
}
