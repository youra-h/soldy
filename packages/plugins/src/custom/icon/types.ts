// plugins/custom/icon/types.ts

export type TIconStylesPluginEvents = {
	'change:styles': (styles: Record<string, string | number>) => void
}
