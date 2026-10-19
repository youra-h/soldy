import type { TPopoverFocusPluginEvents } from '../../popover/focus'

export type TMenuPopoverItemFocusPluginEvents = TPopoverFocusPluginEvents & {
	/**
	 * Tab с последней остановки панели пункта: меню закрывается целиком, и
	 * фокус уходит к остановке за его корнем, как Tab из панели меню (APG
	 * Menu). Куда — знает только корень, поэтому пункт сообщает о Tab меню над
	 * собой, а корень гасит клавишу, если повёл фокус сам
	 */
	tab: (event: KeyboardEvent) => void
}
