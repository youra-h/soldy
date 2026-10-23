/**
 * Слот, развёрнутый там, где стоит в разметке: под `Elevate` владельца
 * коллекции, чтобы элементы в слоте видели его слой. Задан ли слот, решает
 * его значение, а не узлы: компонент в слоте — содержимое, что бы он ни
 * нарисовал. AGENTS.md (Solid), «Слоты».
 *
 * - незаданный — `fallback` (у владельца коллекции — элементы из данных);
 * - заданный — узлы, а с `children` — обёртка вокруг них;
 * - со `scope` — функция слота получает его живым и зовётся один раз.
 */

import { children, createMemo, type Accessor, type JSX } from 'solid-js'
import { Show } from '../runtime/flow'
import { hasSlot, slotValue, type TSlotContent } from './slots'

type TResolvedSlotBase = {
	fallback?: JSX.Element
	/** Обёртка вокруг заданного слота. */
	children?: (nodes: Accessor<JSX.Element | undefined>) => JSX.Element
}

/** Без scope функция слота не проходит: звать её было бы не с чем. */
type TPlainSlotProps = TResolvedSlotBase & {
	content: JSX.Element | undefined
	scope?: undefined
}

type TScopedSlotProps<TScope extends object> = TResolvedSlotBase & {
	content: TSlotContent<TScope> | undefined
	scope: () => TScope
}

export type TResolvedSlotProps<TScope extends object = object> =
	TPlainSlotProps | TScopedSlotProps<TScope>

export function ResolvedSlot<TScope extends object>(
	props: TResolvedSlotProps<TScope>,
): JSX.Element {
	const value = valueOf(props)
	const nodes = children(value)
	const wrap = props.children

	return (
		<Show when={hasSlot(value())} fallback={props.fallback}>
			{wrap ? wrap(nodes) : nodes()}
		</Show>
	)
}

/** Значение слота мемо; есть ли у слота scope, за жизнь компонента не меняется. */
function valueOf<TScope extends object>(
	props: TResolvedSlotProps<TScope>,
): Accessor<JSX.Element | undefined> {
	if (props.scope === undefined) return createMemo(() => slotValue(() => props.content, noScope))

	const scope = props.scope

	return createMemo(() => slotValue(() => props.content, scope))
}

function noScope(): object {
	return {}
}
