/**
 * Именование React: проп плагина `iconStyles_styles`, событие
 * `element:ready` → колбэк `onElementReady`.
 */

import type { INamingStrategy } from '@soldy-ui/setup'
import { underscorePropNaming, callbackEventNaming } from '@soldy-ui/setup'

export const ReactNaming: INamingStrategy = {
	prop: underscorePropNaming,
	event: callbackEventNaming,
}
