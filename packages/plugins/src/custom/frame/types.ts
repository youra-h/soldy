export type TFrameLayoutPluginEvents = {
	'change:styles': (styles: Record<string, string | number>) => void
	'change:anchor': (element: HTMLElement | null) => void
}
