/**
 * Разворачивание содержимого слота.
 *
 * Слот без scope принимает готовый узел, слот со scope — ещё и функцию, потому
 * что данные становятся известны только внутри компонента.
 *
 * В Solid проверка на функцию требует оговорки: `JSX.Element` сам по себе может
 * быть функцией (ленивое мемо от компилятора), но такие функции вызываются
 * БЕЗ аргументов. Наш признак — объявленная арность: `length > 0` есть только
 * у пользовательской функции слота, принимающей scope.
 */

import { children, type Accessor, type JSX } from 'solid-js'

export type TSlotContent<TScope extends object = object> =
	| JSX.Element
	| ((scope: TScope) => JSX.Element)

/** Функция слота со scope; у ленивого мемо компилятора параметров нет. */
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

/**
 * Передан ли слот — аналог `$slots.x` у Vue и `hasSlot` у React. Не передан —
 * пусто по правилам JSX: `undefined`, `null` и булево Solid не рисует, и
 * `{cond() && <Icon />}` при ложном условии слотом не считается.
 */
export function hasSlot(content: unknown): boolean {
	return content !== undefined && content !== null && typeof content !== 'boolean'
}

/**
 * Содержимое слота, развёрнутое один раз, — аксессором; пустой слот —
 * `undefined`.
 *
 * Так разметка выбирает запасное содержимое: текст Button встаёт на место
 * незаданного слота по умолчанию (`content() ?? state.text`). Прочитать слот
 * дважды — проверить и нарисовать — нельзя: геттер слота в пропсах Solid на
 * каждое чтение заново создаёт его узлы. Поэтому слот разворачивает
 * `children()` Solid — один раз на смену того, что слот читает, — и оба
 * чтения идут из него.
 *
 * Scope — аксессором: его читает только функция слота. Готовые узлы слота от
 * смены scope не пересоздаются, функция слота — зовётся заново с новым.
 */
export function resolveSlot<TScope extends object>(
	content: () => TSlotContent<TScope> | undefined,
	scope: () => TScope,
): Accessor<JSX.Element | undefined> {
	const resolved = children(() => {
		const value = content()

		return isSlotFunction(value) ? value(scope()) : value
	})

	return () => {
		const nodes = resolved()

		return hasSlot(nodes) ? nodes : undefined
	}
}
