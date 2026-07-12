export type TActiveTabOffset = {
	listEl: HTMLElement
	offsetLeft: number
	offsetWidth: number
	offsetTop: number
	offsetHeight: number
}

export type TTabsActiveTabPluginEvents = {
	changeActiveTab: (offset: TActiveTabOffset | null) => void
}
