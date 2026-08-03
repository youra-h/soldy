// plugins/custom/frame/types.ts

export type TFrameStylesPluginEvents = {
	'change:styles': (styles: Record<string, string | number>) => void
	'change:anchor': (element: HTMLElement | null) => void
}
