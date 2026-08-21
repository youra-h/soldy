/**
 * Vue-стратегия именования props и событий.
 *
 * - props:  `icon-styles:styles` → `layout_styles` (camelCase для JS)
 * - events: `element:ready`     → `element:ready` (двоеточия допустимы в emit)
 */

import type { INamingStrategy } from '@soldy/accessor'

export const VueNaming: INamingStrategy = {
	prop: (name) => {
		if (!name.namespace) return name.name

		// Преобразуем kebab-case namespace в camelCase: 'icon-styles' → 'iconStyles'
		const formattedNs = name.namespace.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())

		return `${formattedNs}_${name.name}`
	},

	event: (name) => (name.namespace ? `${name.namespace}:${name.name}` : name.name),
}
