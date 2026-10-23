/**
 * `Show`, `For` и `Index` — как у Solid 1.9, но переживают окна гидратации:
 * пересчёт в окне до конца окна отдаёт прежнюю структуру. На сервере — сами
 * примитивы Solid. В бочку адаптера модуль не входит: имена столкнулись бы с
 * `solid-js`. AGENTS.md (Solid), «Ветки и петли».
 */

import {
	$TRACK,
	For as SolidFor,
	Index as SolidIndex,
	Show as SolidShow,
	createMemo,
	indexArray,
	mapArray,
	untrack,
	type Accessor,
	type JSX,
	type MemoOptions,
} from 'solid-js'
import { isServer } from 'solid-js/web'
import { createHeldMemo } from '../common/hydration'

/** Функция-ребёнок с параметром, а не без него — как у Solid (`flow.d.ts`). */
type RequiredParameter<T> = T extends () => unknown ? never : T

type TCondition<T> = T | undefined | null | false

type TUnkeyedShowProps<T> = {
	when: TCondition<T>
	keyed?: false
	fallback?: JSX.Element
	children: JSX.Element | ((item: Accessor<NonNullable<T>>) => JSX.Element)
}

type TKeyedShowProps<T> = {
	when: TCondition<T>
	keyed: true
	fallback?: JSX.Element
	children: JSX.Element | ((item: NonNullable<T>) => JSX.Element)
}

type TEach<T extends readonly unknown[]> = T | undefined | null | false

type TForProps<T extends readonly unknown[], U extends JSX.Element> = {
	each: TEach<T>
	fallback?: JSX.Element
	children: (item: T[number], index: Accessor<number>) => U
}

type TIndexProps<T extends readonly unknown[], U extends JSX.Element> = {
	each: TEach<T>
	fallback?: JSX.Element
	children: (item: Accessor<T[number]>, index: number) => U
}

/** Без `keyed` ветка сменяется только с истинностью условия. */
const SAME_TRUTHINESS: MemoOptions<unknown> = { equals: (a, b) => !a === !b }

const NO_ITEMS: readonly unknown[] = []

/** Функция-ребёнок — с параметром: ленивое мемо компилятора параметров не имеет. */
function isRenderFunction<TItem>(
	child: JSX.Element | ((item: TItem) => JSX.Element),
): child is (item: TItem) => JSX.Element {
	return typeof child === 'function' && child.length > 0
}

function conditionOf<T>(props: { readonly when: TCondition<T> }): TCondition<T> {
	return props.when
}

export function Show<
	T,
	TRenderFunction extends (item: Accessor<NonNullable<T>>) => JSX.Element,
>(props: {
	when: T | undefined | null | false
	keyed?: false
	fallback?: JSX.Element
	children: JSX.Element | RequiredParameter<TRenderFunction>
}): JSX.Element
export function Show<T, TRenderFunction extends (item: NonNullable<T>) => JSX.Element>(props: {
	when: T | undefined | null | false
	keyed: true
	fallback?: JSX.Element
	children: JSX.Element | RequiredParameter<TRenderFunction>
}): JSX.Element
export function Show<T>(
	props: TUnkeyedShowProps<T> | TKeyedShowProps<T>,
): JSX.Element | Accessor<JSX.Element> {
	// Ветвь выбирает перегрузку `Show` Solid
	if (isServer) return props.keyed ? SolidShow(props) : SolidShow(props)

	const value = createHeldMemo(props, conditionOf<T>)

	return props.keyed ? keyedBranch(props, value) : unkeyedBranch(props, value)
}

/** `keyed`: на каждое новое значение условия — функция-ребёнок заново. */
function keyedBranch<T>(
	props: TKeyedShowProps<T>,
	value: Accessor<TCondition<T>>,
): Accessor<JSX.Element> {
	return createMemo(() => {
		const current = value()

		if (!current) return props.fallback

		const child = props.children

		return isRenderFunction(child) ? untrack(() => child(current)) : child
	})
}

/** Без `keyed`: значение функция-ребёнок читает аксессором. */
function unkeyedBranch<T>(
	props: TUnkeyedShowProps<T>,
	value: Accessor<TCondition<T>>,
): Accessor<JSX.Element> {
	const condition = createMemo(value, undefined, SAME_TRUTHINESS)

	return createMemo(() => {
		if (!condition()) return props.fallback

		const child = props.children

		return isRenderFunction(child) ? untrack(() => child(() => present(value))) : child
	})
}

/** Аксессор снятой ветки значения уже не найдёт — ошибка, как у Solid. */
function present<T>(value: Accessor<TCondition<T>>): NonNullable<T> {
	const current = value()

	if (!current) throw new Error('<Show>: значение прочитано у снятой ветки — условие уже ложно')

	return current
}

/** Петля по записям: запись с той же ссылкой — та же строка. */
export function For<T extends readonly unknown[], U extends JSX.Element>(props: {
	each: T | undefined | null | false
	fallback?: JSX.Element
	children: (item: T[number], index: Accessor<number>) => U
}): JSX.Element
export function For<T extends readonly unknown[], U extends JSX.Element>(
	props: TForProps<T, U>,
): JSX.Element | Accessor<U[]> {
	if (isServer) return SolidFor(props)

	return createLoopMemo(
		props,
		mapArray<T[number], U>(() => props.each, props.children, fallbackOf(props)),
	)
}

/** Петля по местам: запись на месте сменилась — строка та же. */
export function Index<T extends readonly unknown[], U extends JSX.Element>(props: {
	each: T | undefined | null | false
	fallback?: JSX.Element
	children: (item: Accessor<T[number]>, index: number) => U
}): JSX.Element
export function Index<T extends readonly unknown[], U extends JSX.Element>(
	props: TIndexProps<T, U>,
): JSX.Element | Accessor<U[]> {
	if (isServer) return SolidIndex(props)

	return createLoopMemo(
		props,
		indexArray<T[number], U>(() => props.each, props.children, fallbackOf(props)),
	)
}

/** `fallback` петли — как у Solid: только когда проп задан. */
function fallbackOf(props: {
	readonly fallback?: JSX.Element
}): { fallback: Accessor<JSX.Element> } | undefined {
	return 'fallback' in props ? { fallback: () => props.fallback } : undefined
}

/**
 * Мемо отображения петли (`mapArray`, `indexArray`): в окне оно читает список
 * и элементы стора (`$TRACK`), но строк не строит.
 */
function createLoopMemo<U>(
	props: { readonly each: TEach<readonly unknown[]> },
	map: () => U[],
): Accessor<U[]> {
	return createHeldMemo(
		map,
		(live) => live(),
		() => Reflect.get(props.each || NO_ITEMS, $TRACK),
	)
}
