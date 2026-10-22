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
 *   (края списка табов);
 * - слот со scope — с `scope`, аксессором: функция слота получает его живым
 *   (`liveScope`), как от `resolveSlot`, и зовётся один раз, а прочитанное в
 *   её разметке следует за scope на месте. Так Tags отдаёт слоту `default`
 *   показанные теги, а Select слотам `field` и `tags` — свои экземпляры: свои
 *   теги входят в коллекцию набора, а своё поле встаёт под пустую связку
 *   поля формы, только когда развёрнуты в слое владельца. Без `scope` тип
 *   функцию слота не пропускает: звать её было бы не с чем.
 *
 * Ветка здесь — `Show` Solid, а не адаптера (`../runtime/flow.ts`): её условие
 * зависит от узлов слота, а узлы границы `Suspense`, досланной потоком, Solid
 * принимает в окне её гидратации — и ветка обязана сменить запасное на них в
 * том же окне. Так владелец, чьё содержимое целиком за границей, получает свои
 * элементы.
 */

import { Show, type Accessor, type JSX } from 'solid-js'
import { resolveSlot, type TSlotContent } from './slots'

/** Общее у слота без scope и со scope: запасное и обёртка. */
type TResolvedSlotBase = {
	/** Что рисовать на месте незаданного слота. */
	fallback?: JSX.Element
	/** Обёртка вокруг заданного слота; без неё рисуются сами узлы. */
	children?: (nodes: Accessor<JSX.Element | undefined>) => JSX.Element
}

/** Слот без scope: содержимое — готовые узлы, функция слота сюда не проходит. */
type TPlainSlotProps = TResolvedSlotBase & {
	/** Содержимое слота без scope — проп владельца. */
	content: JSX.Element | undefined
	scope?: undefined
}

/** Слот со scope: содержимое — узлы или функция слота. */
type TScopedSlotProps<TScope extends object> = TResolvedSlotBase & {
	/** Содержимое слота со scope — проп владельца: узлы или функция слота. */
	content: TSlotContent<TScope> | undefined
	/** Scope слота — аксессором: функция слота получает его живым. */
	scope: () => TScope
}

export type TResolvedSlotProps<TScope extends object = object> =
	TPlainSlotProps | TScopedSlotProps<TScope>

export function ResolvedSlot<TScope extends object>(
	props: TResolvedSlotProps<TScope>,
): JSX.Element {
	const content = resolvedOf(props)
	const wrap = props.children

	return (
		<Show when={content() !== undefined} fallback={props.fallback}>
			{wrap ? wrap(content) : content()}
		</Show>
	)
}

/**
 * Слот, развёрнутый один раз. Со scope он или без, решает сборка: `scope` —
 * аксессор, и есть ли он у слота, за жизнь компонента не меняется.
 */
function resolvedOf<TScope extends object>(
	props: TResolvedSlotProps<TScope>,
): Accessor<JSX.Element | undefined> {
	if (props.scope === undefined) {
		return resolveSlot(
			() => props.content,
			() => ({}),
		)
	}

	return resolveSlot(() => props.content, props.scope)
}
