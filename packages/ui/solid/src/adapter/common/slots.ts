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

import type { JSX } from 'solid-js'

export type TSlotContent<TScope extends object = {}> =
	| JSX.Element
	| ((scope: TScope) => JSX.Element)

export function renderSlot<TScope extends object = {}>(
	content: TSlotContent<TScope> | undefined,
	scope?: TScope,
): JSX.Element {
	if (typeof content === 'function' && content.length > 0) {
		return (content as (scope: TScope) => JSX.Element)((scope ?? {}) as TScope)
	}

	return content as JSX.Element
}
