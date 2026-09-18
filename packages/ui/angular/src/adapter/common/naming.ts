/**
 * Angular-стратегия именования props и событий.
 *
 * - props:  `styles` @ ns `icon-styles` → `iconStyles_styles` (общее правило)
 * - events: `element:ready`             → `elementReady`
 *
 * Angular-специфика: имена @Output должны быть валидными TS-идентификаторами,
 * поэтому двоеточия схлопываются в camelCase, а `on`-префикс не добавляется.
 *
 * В camelCase переводится `TName.getName()`: своей копии формата
 * `namespace:name` здесь нет — её пришлось бы менять вместе с `getName()`.
 * Базу имени так же берут Vue и Web Components, только отдают её как есть.
 */

import type { INamingStrategy } from '@soldy/accessor'
import { underscorePropNaming } from '@soldy/setup'

function toCamelCase(input: string): string {
	return input
		.split(/[-:]/)
		.filter(Boolean)
		.map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
		.join('')
}

export const AngularNaming: INamingStrategy = {
	prop: underscorePropNaming,

	event: (name) => toCamelCase(name.getName()),
}
