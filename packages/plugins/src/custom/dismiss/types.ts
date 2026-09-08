import type { TPluginEvents } from '../../base'

export interface IDismissPluginOptions {
	/**
	 * Свойство инстанса, которым выражена открытость.
	 *
	 * Плагин сам следит за ним: пока оно `false`, глобального слушателя нет, а
	 * нажатие мимо ставит его в `false`. Так связка «открыто ⇄ слушаем»
	 * описана один раз, а не в шаблоне каждого из шести адаптеров.
	 *
	 * `null` отключает привязку — тогда `enabled` ставится вручную.
	 */
	property?: string | null

	/** Событие, по которому плагин пересматривает слежение. */
	event?: string

	/** Слушать ли документ сразу после установки. */
	enabled?: boolean
}

export type TDismissPluginEvents = TPluginEvents & {
	/** Нажатие пришлось мимо владельца и его панелей. */
	dismiss: (event: PointerEvent) => void
	/** change:enabled */
	'change:enabled': (value: boolean) => void
}
