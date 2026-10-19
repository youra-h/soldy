import type { TPluginEvents } from '../../../base'

export type TMenuSubmenuFocusPluginEvents = TPluginEvents & {
	/**
	 * Tab в подменю — в его панели, на его строке или в подменю ниже: меню
	 * закрывается целиком, и фокус уходит, как Tab из панели корня (APG Menu).
	 * Куда — знает только корень, поэтому подменю сообщает о Tab меню над
	 * собой, а корень гасит клавишу, если повёл фокус сам
	 */
	tab: (event: KeyboardEvent) => void
}
