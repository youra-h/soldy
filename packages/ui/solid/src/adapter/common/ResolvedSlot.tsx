/**
 * ResolvedSlot — слот, развёрнутый там, где стоит в разметке: под слоем лифта
 * владельца коллекции.
 *
 * Узлы слота Solid создаёт там, где его геттер прочли, — под тем владельцем,
 * который тогда выполняется, и контекст они видят его. `resolveSlot` в теле
 * владельца коллекции собрал бы `<X.Item>` вне его `Elevate`, и элементы не
 * увидели бы ни движка, ни регистратора. Поэтому слот, по которому разметка
 * владельца что-то решает, разворачивает `ResolvedSlot`, стоящий внутри
 * `Elevate`, — один раз, как `resolveSlot`.
 *
 * - незаданный слот — `fallback`: у владельца коллекции это элементы из
 *   данных;
 * - заданный — его узлы, а с `children` — то, что `children` из них
 *   нарисует: обёртку, которая стоит, только когда в неё есть что положить
 *   (края списка табов).
 */

import { Show, type Accessor, type JSX } from 'solid-js'
import { resolveSlot } from './slots'

export type TResolvedSlotProps = {
	/** Содержимое слота без scope — проп владельца. */
	content: JSX.Element | undefined
	/** Что рисовать на месте незаданного слота. */
	fallback?: JSX.Element
	/** Обёртка вокруг заданного слота; без неё рисуются сами узлы. */
	children?: (nodes: Accessor<JSX.Element | undefined>) => JSX.Element
}

export function ResolvedSlot(props: TResolvedSlotProps): JSX.Element {
	const content = resolveSlot(
		() => props.content,
		() => ({}),
	)
	const wrap = props.children

	return (
		<Show when={content() !== undefined} fallback={props.fallback}>
			{wrap ? wrap(content) : content()}
		</Show>
	)
}
