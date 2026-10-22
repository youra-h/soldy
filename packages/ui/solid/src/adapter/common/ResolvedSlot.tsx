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
 * Задан ли слот, решает его значение — то, что вернул геттер пропа или
 * функция слота (`slotValue`), — а не узлы, в которые Solid его развернул.
 * Компонент в слоте — содержимое, что бы он ни нарисовал, как у Vue и React,
 * где слот — VNode и элемент компонента, а не его узлы; пустое по правилам
 * JSX (`hasSlot`) — `{cond() && <X />}` при ложном условии — слот не задаёт.
 * Так элемент разметки, удалённый из коллекции движком, пока смонтирован,
 * перестаёт рисоваться, но остаётся содержимым владельца. По узлам владелец
 * переключился бы на элементы из данных, а показанное, по которому они
 * рисуются, к этому времени ещё не обновлено (`change:items` приходит после
 * `item:removed`): элемент удалённого экземпляра вошёл бы в коллекцию снова,
 * невидимым. `<Show when={false}>` в слоте — тоже компонент и тоже
 * содержимое: запасное включает пустое значение, а не пустая ветка.
 *
 * - незаданный слот — `fallback`: у владельца коллекции это элементы из
 *   данных;
 * - заданный — его узлы, а с `children` — то, что `children` из них
 *   нарисует: обёртку (края списка табов, подвал календаря). Правило то же:
 *   обёртка стоит при заданном слоте, даже когда узлов в ней нет, а снимает
 *   её пустое значение — подвал календаря DatePicker задаёт, только пока
 *   `confirmable`;
 * - слот со scope — с `scope`, аксессором: функция слота получает его живым
 *   (`liveScope`), как от `resolveSlot`, и зовётся один раз, а прочитанное в
 *   её разметке следует за scope на месте. Так Tags отдаёт слоту `default`
 *   показанные теги, а Select слотам `field` и `tags` — свои экземпляры: свои
 *   теги входят в коллекцию набора, а своё поле встаёт под пустую связку
 *   поля формы, только когда развёрнуты в слое владельца. Без `scope` тип
 *   функцию слота не пропускает: звать её было бы не с чем.
 *
 * `resolveSlot` — разворот в теле компонента: текст Button, значки окон и
 * элементов — решает по узлам (его шапка). Его запасное ничего не
 * регистрирует, а составные компоненты отдают внутренним ветку, пустую по
 * своему состоянию.
 *
 * Ветка — `Show` адаптера (`../runtime/flow.ts`), и окна гидратации она
 * переживает, как остальные. Условие зависит от значения слота, а не от его
 * узлов, и содержимое за границей `Suspense`, досланной потоком, стоит на своей
 * ветке с первого значения: узлы границы Solid принимает в окне её гидратации,
 * и приходят они в ту же ветку.
 */

import { children, createMemo, type Accessor, type JSX } from 'solid-js'
import { Show } from '../runtime/flow'
import { hasSlot, slotValue, type TSlotContent } from './slots'

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
	const value = valueOf(props)
	// Узлы — поверх значения: геттер слота прочитан один раз, в мемо значения
	const nodes = children(value)
	const wrap = props.children

	return (
		<Show when={hasSlot(value())} fallback={props.fallback}>
			{wrap ? wrap(nodes) : nodes()}
		</Show>
	)
}

/**
 * Значение слота — мемо: геттер пропа читается в нём один раз на смену того,
 * что он читает. Со scope слот или без, решает сборка: `scope` — аксессор, и
 * есть ли он у слота, за жизнь компонента не меняется.
 */
function valueOf<TScope extends object>(
	props: TResolvedSlotProps<TScope>,
): Accessor<JSX.Element | undefined> {
	if (props.scope === undefined) {
		return createMemo(() =>
			slotValue(
				() => props.content,
				() => ({}),
			),
		)
	}

	const scope = props.scope

	return createMemo(() => slotValue(() => props.content, scope))
}
