/**
 * Разворачивание содержимого слота.
 *
 * Слот без scope принимает готовый узел, слот со scope — ещё и функцию, потому
 * что данные становятся известны только внутри компонента. Форма содержимого
 * здесь и определяется: функция — вызвать со scope, всё остальное — вернуть
 * как есть.
 *
 * React-элементы это объекты, а не функции, поэтому проверка однозначна.
 */

import type { ReactNode } from 'react'

export type TSlotContent<TScope extends object = object> =
	| ReactNode
	| ((scope: TScope) => ReactNode)

export function renderSlot<TScope extends object = object>(
	content: TSlotContent<TScope> | undefined,
	scope?: TScope,
): ReactNode {
	if (typeof content === 'function') return content((scope ?? {}) as TScope)

	return content
}
