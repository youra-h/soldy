/**
 * Solid-стратегия именования props и событий.
 *
 * - props:  `styles` @ ns `icon-styles` → `iconStyles_styles` (общее правило)
 * - events: `element:ready`             → `onElementReady`
 *
 * В Solid события компонентов — обычные колбэк-пропы, поэтому стратегия та же,
 * что у React и Svelte. Тип-зеркало — `TCallbackEventProps` из @soldy/setup.
 */

import type { INamingStrategy } from '@soldy/accessor'
import { underscorePropNaming, callbackEventNaming } from '@soldy/setup'

export const SolidNaming: INamingStrategy = {
	prop: underscorePropNaming,
	event: callbackEventNaming,
}
