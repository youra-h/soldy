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

import { children, untrack, type Accessor, type JSX } from 'solid-js'

export type TSlotContent<TScope extends object = object> =
	JSX.Element | ((scope: TScope) => JSX.Element)

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
 * Живой scope слота — объект с геттерами по ключам scope: каждый геттер берёт
 * своё значение из аксессора `scope` на каждое чтение. Функции слота его
 * отдают так: `renderSlot(props.trigger, liveScope(() => ({ … })))`.
 *
 * Нужен, когда содержимое слота должно пережить смену scope. Связка триггера
 * Popover (`triggerAria`, `triggerDataset`) меняется на каждое открытие, а
 * свежий объект scope функцию слота перезапускает: и литерал scope в разметке,
 * и `resolveSlot` читают его там, где зовут функцию, — и Solid пересоздал бы
 * всё, что она нарисовала. Новый триггер на каждое открытие, а при закрытии
 * кликом по триггеру фокус с прежнего узла падал бы на `body`.
 *
 * С живым scope функция слота зовётся один раз, а чтение уходит туда, где
 * scope читают:
 *
 * - в разметке — `<Button {...scope.triggerAria} />`, `{scope.text}`:
 *   компилятор Solid отдаёт спред и выражение аксессором, и смена scope
 *   обновляет их на месте — узлы те же;
 * - в теле функции — деструктуризация `({ triggerAria }) => …`, условие
 *   `scope.selected ? … : null`: читается при вызове, и смена scope функцию
 *   перезапускает, как свежий объект.
 *
 * Тип scope тот же, что в дескрипторе и у остальных адаптеров: значения, а не
 * аксессоры. Ключи — первого чтения, вне слежения: scope — литерал компонента,
 * набор ключей у него постоянный, а слежение за аксессором остаётся геттерам.
 *
 * Чем отличается от `resolveSlot`: тот разворачивает слот один раз, чтобы
 * разметка выбрала запасное содержимое, а функцию слота зовёт со свежим
 * объектом scope — и перезапускает её на каждую смену. Живой scope — про то,
 * чтобы смена scope функцию не перезапускала.
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
