/**
 * Vue-стратегия именования props и событий.
 *
 * - props:  `styles` @ ns `icon-styles` → `iconStyles_styles` (общее правило)
 * - events: `element:ready`             → `element:ready` (двоеточия допустимы в emit)
 */

import type { INamingStrategy } from '@soldy/accessor'
import { defaultPropNaming } from '@soldy/setup'

export const VueNaming: INamingStrategy = {
	prop: defaultPropNaming,

	event: (name) => (name.namespace ? `${name.namespace}:${name.name}` : name.name),
}
