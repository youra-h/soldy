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

/**
 * Проброс слота владельца коллекции в слот элемента — то, что у Vue пишут
 * `<template #default="{ text }"><slot name="item" :item :text /></template>`,
 * как `relaySlot` у React.
 *
 * Элемент зовёт слот со своим scope, а проброс добавляет к нему то, что знает
 * владелец, — сам элемент (`extra`). Готовые узлы, нарисованные владельцем,
 * scope элемента теряли бы: `text`, `selected` и `active` держит элемент, и до
 * слота владельца они не доходили.
 *
 * Проброс — функция с параметром: функцию слота `renderSlot` узнаёт по
 * арности, и без параметра проброс сочли бы ленивым мемо компилятора — готовым
 * содержимым. Слот владельца не задан — проброса нет (`undefined`): по
 * наличию слота элемент решает, рисовать ли своё — текст, отметку. Пустое,
 * которое вернул слот владельца, элемент тоже видит (`resolveSlot`) и рисует
 * своё, как у Vue и React.
 *
 * Scope элемента выводится из места, куда проброс отдают, — из типа слота
 * элемента. Из слота владельца его не вывести: там он слит с `extra`, и
 * `NoInfer` не даёт выводу туда смотреть.
 */
export function relaySlot<TScope extends object, TExtra extends object>(
	content: TSlotContent<NoInfer<TScope & TExtra>> | undefined,
	extra: TExtra,
): ((scope: TScope) => JSX.Element) | undefined {
	if (!hasSlot(content)) return undefined

	return (scope) => renderSlot<TScope & TExtra>(content, { ...scope, ...extra })
}
