/** Имена поверхности: события — колбэк-пропы, как у React (`element:ready` → `onElementReady`). */

import type { INamingStrategy } from '@soldy-ui/setup'
import { underscorePropNaming, callbackEventNaming } from '@soldy-ui/setup'

export const SvelteNaming: INamingStrategy = {
	prop: underscorePropNaming,
	event: callbackEventNaming,
}
