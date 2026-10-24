import type { TPluginEvents } from '../../../base'

/**
 * Место активного таба: `offset*` его узла — от ряда набора (`barEl`), его
 * ближайшего позиционированного предка в разметке темы. Нет активного таба —
 * нули.
 */
export type TActiveTabOffset = {
	barEl: HTMLElement
	offsetLeft: number
	offsetWidth: number
	offsetTop: number
	offsetHeight: number
}

export type TTabsActiveTabPluginEvents = TPluginEvents & {
	'change:active-tab': (offset: TActiveTabOffset | null) => void
}
