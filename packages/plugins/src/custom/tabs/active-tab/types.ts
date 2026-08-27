export type TActiveTabOffset = {
	listEl: HTMLElement
	offsetLeft: number
	offsetWidth: number
	offsetTop: number
	offsetHeight: number
}

export type TTabsActiveTabPluginEvents = {
	'change:active-tab': (offset: TActiveTabOffset | null) => void
}
