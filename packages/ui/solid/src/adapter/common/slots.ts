/**
 * Слоты: готовые узлы или функция со scope. Функцию слота отличает арность:
 * ленивое мемо компилятора — тоже функция, но без параметров. Scope функция
 * получает живым (`liveScope`). AGENTS.md (Solid), «Слоты».
 */

import { children, untrack, type Accessor, type JSX } from 'solid-js'

export type TSlotContent<TScope extends object = object> =
	JSX.Element | ((scope: TScope) => JSX.Element)

function isSlotFunction<TScope extends object>(
	content: TSlotContent<TScope> | undefined,
): content is (scope: TScope) => JSX.Element {
	return typeof content === 'function' && content.length > 0
}

export function renderSlot<TScope extends object = object>(
	content: TSlotContent<TScope> | undefined,
	scope?: TScope,
): JSX.Element {
	if (isSlotFunction(content)) return content((scope ?? {}) as TScope)

	return content
}

/** Передан ли слот: `undefined`, `null` и булево Solid не рисует. */
export function hasSlot(content: unknown): boolean {
	return content !== undefined && content !== null && typeof content !== 'boolean'
}

/** Значение слота: геттер пропа прочитан, функция слота вызвана с живым scope. */
export function slotValue<TScope extends object>(
	content: () => TSlotContent<TScope> | undefined,
	scope: () => TScope,
): JSX.Element | undefined {
	const value = content()

	return isSlotFunction(value) ? value(liveScope(scope)) : value
}

/**
 * Слот, развёрнутый один раз, — аксессором; пустой по узлам — `undefined`.
 * Так разметка выбирает запасное: `content() ?? state.text`. Геттер слота
 * Solid на каждое чтение создаёт узлы заново, поэтому читают его один раз.
 */
export function resolveSlot<TScope extends object>(
	content: () => TSlotContent<TScope> | undefined,
	scope: () => TScope,
): Accessor<JSX.Element | undefined> {
	const resolved = children(() => slotValue(content, scope))

	return () => {
		const nodes = resolved()

		return hasSlot(nodes) ? nodes : undefined
	}
}

/**
 * Живой scope — геттеры по ключам первого чтения: прочитанное в разметке слота
 * следует за scope на месте, и функция слота не перезапускается на каждую
 * смену (фокус и состояние внутри слота сохраняются).
 */
export function liveScope<TScope extends object>(scope: () => TScope): TScope {
	const first = untrack(scope)
	const live: TScope = { ...first }

	for (const key of Object.keys(first)) {
		Object.defineProperty(live, key, {
			enumerable: true,
			get: () => Reflect.get(scope(), key),
		})
	}

	return live
}

/** Scope элемента живыми полями, поверх — `extra`, как `{ ...scope, ...extra }`. */
function joinScope<TScope extends object, TExtra extends object>(
	scope: TScope,
	extra: TExtra,
): TScope & TExtra {
	const joined = untrack(() => ({ ...scope, ...extra }))

	for (const key of Object.keys(scope)) {
		if (Object.hasOwn(extra, key)) continue

		Object.defineProperty(joined, key, {
			enumerable: true,
			get: () => Reflect.get(scope, key),
		})
	}

	return joined
}

/**
 * Проброс слота владельца коллекции в слот элемента: scope элемента плюс сам
 * элемент (`extra`). Не задан — `undefined`, и элемент рисует своё. Scope
 * выводится из слота элемента: `NoInfer` не даёт смотреть в слот владельца.
 */
export function relaySlot<TScope extends object, TExtra extends object>(
	content: TSlotContent<NoInfer<TScope & TExtra>> | undefined,
	extra: TExtra,
): ((scope: TScope) => JSX.Element) | undefined {
	if (!hasSlot(content)) return undefined

	return (scope) => renderSlot<TScope & TExtra>(content, joinScope(scope, extra))
}
