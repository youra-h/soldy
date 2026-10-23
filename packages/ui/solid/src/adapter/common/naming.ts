import type { INamingStrategy } from '@soldy-ui/setup'
import { underscorePropNaming, callbackEventNaming } from '@soldy-ui/setup'

/** Имена Solid: `iconStyles_styles`, события — колбэк-пропсы `onElementReady`. */
export const SolidNaming: INamingStrategy = {
	prop: underscorePropNaming,
	event: callbackEventNaming,
}
