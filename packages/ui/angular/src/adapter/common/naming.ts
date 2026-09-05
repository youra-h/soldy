/**
 * Angular-стратегия именования props и событий.
 *
 * - props:  `icon-styles:styles` → `iconStyles_styles` (совпадает с Vue / React)
 * - events: `element:ready`     → `elementReady` (camelCase, без префикса `on`)
 *
 * Angular-специфика: @Output-свойства не используют `on`-префикс, а имя
 * с двоеточием невалидно для идентификаторов TypeScript.
 */

import type { INamingStrategy } from '@soldy/accessor'

function toCamelCase(input: string): string {
	return input
		.split(/[-:]/)
		.filter(Boolean)
		.map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
		.join('')
}

export const AngularNaming: INamingStrategy = {
	prop: (name) => {
		if (!name.namespace) return name.name

		const ns = name.namespace.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())

		return `${ns}_${name.name}`
	},

	event: (name) => {
		const base = name.namespace ? `${name.namespace}:${name.name}` : name.name

		return toCamelCase(base)
	},
}
