/**
 * React-стратегия именования props и событий.
 *
 * - props:  `styles` @ ns `icon-styles` → `iconStyles_styles` (общее правило)
 * - events: `element:ready`             → `onElementReady` (колбэки-пропсы React)
 *
 * Обе стратегии общие: то же именование у Svelte 5, где события тоже
 * колбэк-пропы. Тип-зеркало — `TCallbackEventProps` из @soldy-ui/setup.
 */

import type { INamingStrategy } from '@soldy-ui/setup'
import { underscorePropNaming, callbackEventNaming } from '@soldy-ui/setup'

export const ReactNaming: INamingStrategy = {
	prop: underscorePropNaming,
	event: callbackEventNaming,
}
