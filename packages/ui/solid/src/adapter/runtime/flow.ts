/**
 * Ветки и петли компонентов — `Show`, `For` и `Index`, как у Solid, но
 * переживают окна гидратации (`../common/hydration.ts`, шапка).
 *
 * Пока открыто окно гидратации, Solid структуру не меняет: новый узел ищет по
 * ключу гидратации текущего окна, а под ним у сервера чужой узел или никакого
 * (`Hydration Mismatch`), снятие же узла у подключённого родителя пропускает.
 * Структура компонента меняется в окне, когда в коллекцию входит элемент ниже
 * по разметке — в основном окне — или за границей `Suspense`, которую сервер
 * дослал потоком, — в позднем: панель таба становится активной, слот пустого
 * списка уходит, в регион тостов, который браузер нарисовал сам, приходит
 * тост. Поэтому мемо условия (`Show`) и мемо отображения (`For`, `Index`)
 * переживают окно, как мемо раскладки (`createRootProps`):
 * - первое значение — живое: структура после детей читает то же, что сервер
 *   (сторожит `__tests__/hydration/list-box.hydration.spec.tsx`);
 * - пересчёт в любом окне читает источник и до конца окна отдаёт прежнее:
 *   ветка не сменяется, новых строк нет, записи не обновляются;
 * - после окна мемо отдаёт живое, и Solid строит и снимает узлы уже вне
 *   гидратации (сторожит `__tests__/hydration/structure.hydration.spec.tsx`).
 *
 * Вне окна это клиентские `Show`, `For` и `Index` Solid 1.9: сверка условия по
 * истинности (`!a === !b`), пока нет `keyed`, функция-ребёнок получает
 * аксессор или значение, есть `fallback`. Вычислений на экземпляр столько же,
 * сколько у Solid: удержание живёт в собственном мемо примитива, а
 * `createComponent` внутри не зовётся — и ключи гидратации у детей те же. На
 * сервере окон нет, и там работают `Show`, `For` и `Index` Solid как есть.
 *
 * Имена — как у Solid: откуда они, видно из пути импорта. В бочку адаптера
 * модуль не входит: `adapter/` целиком уходит в `@soldy-ui/solid`, и у
 * потребителя имена столкнулись бы с `solid-js`. Компоненты берут примитивы по
 * пути модуля, а из `solid-js` их не импортируют (блок eslint
 * `soldy/solid-components-flow`). Петля по ключу записи — `KeyedFor`, рядом, с
 * тем же удержанием. `Switch` и `Match` компонентам пока не нужны;
 * понадобятся — адаптер даст свои.
 *
 * Вне правила — тег корня (`Dynamic`) и текст: их меняет проп приложения, — и
 * ветки `Teleport` на `Show` Solid: условие у них — цель и `disabled`, а
 * содержимое портала Solid рисует после окна сам. Ветка `ResolvedSlot` — этот
 * `Show`: задан ли слот, она решает по его значению, а не по узлам, и
 * содержимое за границей `Suspense`, досланной потоком, стоит на своей ветке с
 * первого значения — узлы границы, которые Solid примет в окне её
 * гидратации, приходят в ту же ветку, и ListBox, чьё содержимое целиком за
 * границей, получает свои элементы.
 *
 * Сигнатуры — как у Solid (`solid-js/types/render/flow.d.ts`), без `any`:
 * компонент отдаёт `JSX.Element`. Отдаёт он мемо — аксессор, который Solid
 * рисует сам, а тип JSX функций не описывает, поэтому тип реализации шире.
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
import { UNCOMPUTED, awaitHydrationEnd, hydrating } from '../common/hydration'

/** Функция-ребёнок с параметром, а не без него — как у Solid (`flow.d.ts`). */
type RequiredParameter<T> = T extends () => unknown ? never : T

/** Условие ветки: ложное значение прячет ветку. */
type TCondition<T> = T | undefined | null | false

/** `Show` без `keyed`: функция-ребёнок получает значение аксессором. */
type TUnkeyedShowProps<T> = {
	when: TCondition<T>
	keyed?: false
	fallback?: JSX.Element
	children: JSX.Element | ((item: Accessor<NonNullable<T>>) => JSX.Element)
}

/** `Show` с `keyed`: функция-ребёнок получает само значение — и заново на каждое новое. */
type TKeyedShowProps<T> = {
	when: TCondition<T>
	keyed: true
	fallback?: JSX.Element
	children: JSX.Element | ((item: NonNullable<T>) => JSX.Element)
}

/** Список петли — как у Solid. */
type TEach<T extends readonly unknown[]> = T | undefined | null | false

/** Пропсы `For`: функция-ребёнок получает запись и место аксессором. */
type TForProps<T extends readonly unknown[], U extends JSX.Element> = {
	each: TEach<T>
	fallback?: JSX.Element
	children: (item: T[number], index: Accessor<number>) => U
}

/** Пропсы `Index`: функция-ребёнок получает запись аксессором и место. */
type TIndexProps<T extends readonly unknown[], U extends JSX.Element> = {
	each: TEach<T>
	fallback?: JSX.Element
	children: (item: Accessor<T[number]>, index: number) => U
}

/** Сверка условия без `keyed`: ветка сменяется только с истинностью условия. */
const SAME_TRUTHINESS: MemoOptions<unknown> = { equals: (a, b) => !a === !b }

/** Отсутствующий список петля Solid читает как пустой — и `$TRACK` у него тоже. */
const NO_ITEMS: readonly unknown[] = []

/**
 * Функция-ребёнок — функция с параметром: ленивое мемо компилятора Solid —
 * тоже функция, но без параметров, и это готовое содержимое.
 */
function isRenderFunction<TItem>(
	child: JSX.Element | ((item: TItem) => JSX.Element),
): child is (item: TItem) => JSX.Element {
	return typeof child === 'function' && child.length > 0
}

/**
 * Ветка: `children`, пока условие `when` истинно, иначе `fallback`.
 * Функция-ребёнок получает значение условия — аксессором, а с `keyed` —
 * самим значением.
 */
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
	// На сервере окон нет — `Show` Solid как есть; ветвь выбирает его перегрузку
	if (isServer) return props.keyed ? SolidShow(props) : SolidShow(props)

	// Мемо условия: первое значение живое, пересчёт в окне гидратации — прежнее
	const value = createMemo<TCondition<T>, typeof UNCOMPUTED>((previous) => {
		const when = props.when

		if (previous === UNCOMPUTED || !hydrating()) return when

		awaitHydrationEnd()

		return previous
	}, UNCOMPUTED)

	return props.keyed ? keyedBranch(props, value) : unkeyedBranch(props, value)
}

/** Ветка `keyed`: на каждое новое значение условия — функция-ребёнок заново. */
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

/**
 * Ветка без `keyed`: сменяется только с истинностью условия, а значение
 * функция-ребёнок читает аксессором.
 */
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

/**
 * Значение ветки для аксессора функции-ребёнка. Пока ветка стоит, условие
 * истинно; аксессор снятой ветки, прочитанный из таймера или промиса,
 * значения уже не найдёт, и чтение — ошибка, как у Solid.
 */
function present<T>(value: Accessor<TCondition<T>>): NonNullable<T> {
	const current = value()

	if (!current) throw new Error('<Show>: значение прочитано у снятой ветки — условие уже ложно')

	return current
}

/**
 * Петля по записям: строка на запись, запись с той же ссылкой — та же строка.
 * Функция-ребёнок получает запись и место аксессором; пустой список —
 * `fallback`.
 */
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

/**
 * Петля по местам: строка на место, запись на месте сменилась — строка та же.
 * Функция-ребёнок получает запись аксессором и место; пустой список —
 * `fallback`.
 */
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
 * Мемо отображения петли: `map` — отображение `mapArray` или `indexArray`
 * Solid, у которого Solid сделал бы его функцию самим мемо. Первое значение —
 * живое, а пересчёт в окне гидратации читает список так же, как отображение,
 * — сам список и, у списка стора, его элементы (`$TRACK`), — но строк не
 * строит и записей не обновляет: до конца окна отдаёт прежние узлы.
 */
function createLoopMemo<U>(
	props: { readonly each: TEach<readonly unknown[]> },
	map: () => U[],
): Accessor<U[]> {
	return createMemo<U[], typeof UNCOMPUTED>((previous) => {
		if (previous === UNCOMPUTED || !hydrating()) return map()

		Reflect.get(props.each || NO_ITEMS, $TRACK)
		awaitHydrationEnd()

		return previous
	}, UNCOMPUTED)
}
