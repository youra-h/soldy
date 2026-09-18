/**
 * Vue-стратегия именования props и событий.
 *
 * - props:  `styles` @ ns `icon-styles` → `iconStyles_styles` (общее правило)
 * - events: `element:ready`             → `element:ready` (как в ядре)
 *
 * Имя события — `TName.getName()` без преобразований: двоеточия в emit
 * допустимы. Своей копии формата `namespace:name` здесь нет — её пришлось бы
 * менять вместе с `getName()`. То же решение, что в Web Components.
 */

import type { INamingStrategy } from '@soldy/accessor'
import { underscorePropNaming } from '@soldy/setup'

export const VueNaming: INamingStrategy = {
	prop: underscorePropNaming,

	event: (name) => name.getName(),
}
