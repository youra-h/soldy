/**
 * Web Components-стратегия именования props и событий.
 *
 * - props:  `styles` @ ns `icon-styles` → `iconStyles_styles` (общее правило)
 * - events: `element:ready`             → `element:ready` (как в ядре)
 *
 * Имена событий не преобразуются: двоеточия в именах CustomEvent абсолютно
 * легальны, а совпадение с ядром означает, что при отладке нет мысленного
 * перевода. То же решение, что во Vue.
 */

import type { INamingStrategy } from '@soldy/accessor'
import { underscorePropNaming } from '@soldy/setup'

export const WebcNaming: INamingStrategy = {
	prop: underscorePropNaming,

	event: (name) => name.getName(),
}
