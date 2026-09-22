/**
 * Svelte-стратегия именования props и событий.
 *
 * - props:  `styles` @ ns `icon-styles` → `iconStyles_styles` (общее правило)
 * - events: `element:ready`             → `onElementReady`
 *
 * В Svelte 5 события компонентов — обычные колбэк-пропы, поэтому стратегия
 * та же, что у React. Тип-зеркало — `TCallbackEventProps` из @soldy-ui/setup.
 */

import type { INamingStrategy } from '@soldy-ui/setup'
import { underscorePropNaming, callbackEventNaming } from '@soldy-ui/setup'

export const SvelteNaming: INamingStrategy = {
	prop: underscorePropNaming,
	event: callbackEventNaming,
}
