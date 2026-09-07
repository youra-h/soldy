/**
 * Тип-зеркало объявления слотов — та же роль, что у naming.types.ts для событий.
 *
 * Контракт объявлен значением (`slots` в contribution), а тип нужен на уровне
 * типов, поэтому состав слотов дублируется отдельным типом рядом с
 * contribution. Оба обязаны меняться СИНХРОННО; расхождение ловит
 * conformance-тест.
 *
 *   type TButtonSlots = {
 *     leading: {}                  // без scope
 *     default: { text: string }    // scoped
 *     trailing: {}
 *   }
 *
 * `TNode` подставляет адаптер: `ReactNode`, `JSX.Element`, `Snippet`, `VNode`.
 */

import type { DEFAULT_SLOT } from './slots'

/** Слот без scope принимает готовое содержимое, со scope — ещё и функцию. */
type TSlotValue<TScope extends object, TNode> = keyof TScope extends never
	? TNode
	: TNode | ((scope: TScope) => TNode)

/**
 * Слоты как props компонента (React, Solid, Svelte).
 * `default` превращается в `children` — так его называют все три.
 *
 *   TSlotProps<TButtonSlots, ReactNode>
 *     → { leading?: ReactNode; children?: ReactNode | ((s: { text: string }) => ReactNode); trailing?: ReactNode }
 */
export type TSlotProps<TSlots extends object, TNode> = {
	[K in keyof TSlots as K extends typeof DEFAULT_SLOT
		? 'children'
		: K]?: TSlots[K] extends object ? TSlotValue<TSlots[K], TNode> : TNode
}

/**
 * Слоты как функции (Vue `defineSlots`): имена сохраняются, включая `default`.
 *
 *   TSlotFunctions<TButtonSlots, any>
 *     → { leading?: () => any; default?: (scope: { text: string }) => any; trailing?: () => any }
 */
export type TSlotFunctions<TSlots extends object, TNode> = {
	[K in keyof TSlots]?: TSlots[K] extends object
		? keyof TSlots[K] extends never
			? () => TNode
			: (scope: TSlots[K]) => TNode
		: () => TNode
}
