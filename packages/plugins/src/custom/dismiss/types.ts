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

/**
 * Нажатие мимо, которое ждёт решения. Касание решает `pointerup` того же
 * `pointerId`, перо — он же или совместимый `mousedown`, смотря что придёт
 * первым.
 */
export type TDismissPendingPress = {
	pointerId: number
	pointerType: 'touch' | 'pen'
}

export type TDismissPluginEvents = TPluginEvents & {
	/**
	 * Нажатие пришлось мимо владельца и его панелей. Приходит событие, которое
	 * это решило: у мыши — `pointerdown`; у касания — `pointerup`, прокрутка
	 * пальцем не закрывает; у пера — то, что пришло первым: `pointerup`
	 * (стилус на экране) или совместимый `mousedown` (перо графического
	 * планшета). Отсюда тип `MouseEvent`: `PointerEvent` — его подтип.
	 */
	dismiss: (event: MouseEvent) => void
	/** change:enabled */
	'change:enabled': (value: boolean) => void
}

/**
 * Пропсы плагина такими, какими их объявляет contribution — без неймспейса.
 *
 * Неймспейс (`dismiss_enabled`) навешивает `DescriptorAllProps` в `@soldy/setup`
 * по `namespace` из `definePlugin`; здесь только собственные имена пропсов.
 * Защищённого `ownerAttribute` здесь нет: это выход, в разметку его не пишут.
 */
export interface IDismissPluginProps {
	enabled?: boolean
}
