/**
 * React-стратегия именования props и событий.
 *
 * - props:  `icon-styles:styles` → `iconStyles_styles` (совпадает с Vue для единого API)
 * - events: `element:ready`     → `onElementReady` (колбэки-пропсы React)
 */

import type { INamingStrategy } from '@soldy/accessor'

function toPascalCase(input: string): string {
	return input
		.split(/[-:]/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join('')
}

export const ReactNaming: INamingStrategy = {
	prop: (name) => {
		if (!name.namespace) return name.name

		// Преобразуем kebab-case namespace в camelCase: 'icon-styles' → 'iconStyles'
		const formattedNs = name.namespace.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())

		return `${formattedNs}_${name.name}`
	},

	event: (name) => {
		const base = name.namespace ? `${name.namespace}:${name.name}` : name.name

		return `on${toPascalCase(base)}`
	},
}
