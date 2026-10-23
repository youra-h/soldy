import type { TToastRender } from './types'

/** Метки объектов-компонентов React (`memo`, `forwardRef`, `lazy`) — протокол React, как у `react-is`. */
const COMPONENT_OBJECTS: ReadonlySet<unknown> = new Set([
	Symbol.for('react.memo'),
	Symbol.for('react.forward_ref'),
	Symbol.for('react.lazy'),
])

/**
 * Своё содержимое тоста — компонент React, а не готовый элемент и не строка:
 * проп `toast` тост отдаёт ему сам. AGENTS.md (React), «Локаль и тосты».
 */
export function isToastRender(value: unknown): value is TToastRender {
	if (typeof value === 'function') return true

	return (
		typeof value === 'object' &&
		value !== null &&
		'$$typeof' in value &&
		COMPONENT_OBJECTS.has(value.$$typeof)
	)
}
