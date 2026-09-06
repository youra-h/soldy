/**
 * Angular-стратегия именования props и событий.
 *
 * - props:  `styles` @ ns `icon-styles` → `iconStyles_styles` (общее правило)
 * - events: `element:ready`             → `elementReady`
 *
 * Angular-специфика: имена @Output должны быть валидными TS-идентификаторами,
 * поэтому двоеточия схлопываются в camelCase, а `on`-префикс не добавляется.
 */

import type { INamingStrategy } from '@soldy/accessor'
import { defaultPropNaming } from '@soldy/setup'

function toCamelCase(input: string): string {
	return input
		.split(/[-:]/)
		.filter(Boolean)
		.map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
		.join('')
}

export const AngularNaming: INamingStrategy = {
	prop: defaultPropNaming,

	event: (name) => {
		const base = name.namespace ? `${name.namespace}:${name.name}` : name.name

		return toCamelCase(base)
	},
}
