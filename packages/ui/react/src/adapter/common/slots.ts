/**
 * Содержимое слота: функция — вызвать со scope, остальное — как есть; пустое
 * — `undefined`, и встаёт запасное. AGENTS.md (React), «Слоты».
 */

import type { ReactNode } from 'react'

export type TSlotContent<TScope extends object = object> =
	ReactNode | ((scope: TScope) => ReactNode)

export function renderSlot<TScope extends object = object>(
	content: TSlotContent<TScope> | undefined,
	scope?: TScope,
): ReactNode {
	const node = typeof content === 'function' ? content((scope ?? {}) as TScope) : content

	return hasSlot(node) ? node : undefined
}

/** Передан ли слот — аналог `$slots.x` у Vue; функция передана всегда. */
export function hasSlot<TScope extends object>(content: TSlotContent<TScope> | undefined): boolean {
	return content !== undefined && content !== null && typeof content !== 'boolean'
}

/**
 * Проброс слота владельца в слот элемента: к scope элемента добавляется
 * `extra` — сам элемент. Слота нет — проброса нет. Scope элемента выводится
 * из типа слота элемента (`NoInfer`).
 */
export function relaySlot<TScope extends object, TExtra extends object>(
	content: TSlotContent<NoInfer<TScope & TExtra>> | undefined,
	extra: TExtra,
): ((scope: TScope) => ReactNode) | undefined {
	if (!hasSlot(content)) return undefined

	return (scope) => renderSlot<TScope & TExtra>(content, { ...scope, ...extra })
}
