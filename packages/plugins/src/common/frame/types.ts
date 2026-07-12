export type TFrameStylePluginEvents = {
	/** Вызывается при изменении набора стилей фрейма */
	changeStyles: (styles: Record<string, string | number>) => void
	/** Якорь изменён */
	changeAnchor: (anchor: HTMLElement | null) => void
}
