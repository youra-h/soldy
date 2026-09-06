/**
 * React-стратегия именования props и событий.
 *
 * - props:  `styles` @ ns `icon-styles` → `iconStyles_styles` (общее правило)
 * - events: `element:ready`             → `onElementReady` (колбэки-пропсы React)
 *
 * Тип-зеркало `event` живёт в naming.types.ts и должно меняться синхронно.
 */

import type { INamingStrategy } from '@soldy/accessor'
import { defaultPropNaming } from '@soldy/setup'

function toPascalCase(input: string): string {
	return input
		.split(/[-:]/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join('')
}

export const ReactNaming: INamingStrategy = {
	prop: defaultPropNaming,

	event: (name) => {
		const base = name.namespace ? `${name.namespace}:${name.name}` : name.name

		return `on${toPascalCase(base)}`
	},
}
