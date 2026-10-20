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
 *
 * Scope функция слота получает живой (`liveScope`): прочитанное в её
 * разметке следует за scope на месте, и смена scope не пересоздаёт того, что
 * слот нарисовал.
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
 * Scope — аксессором, а функция слота получает его живым (`liveScope`), и
 * мемо `children` следит только за тем, что функция прочла сама, в теле.
 * Прочитанное в разметке слота (`scope.text`) смена scope обновляет на месте:
 * подсказка ручки Slider переживает шаг, содержимое пункта ListBox, таба и
 * секции Accordion — выбор. Прочитанное в теле — деструктуризация, условие
 * `scope.selected ? … : null` — функцию перезапускает: так слот решает,
 * рисовать ли своё, а пустое, что он вернул при новом scope, уступает место
 * запасному. Готовые узлы слота от смены scope не пересоздаются вовсе.
 *
 * Живой scope собирается на вызов функции слота, а не на разворот: слоту без
 * функции он не нужен, и пункт или звезда без слота лишнего объекта не держат.
 */
export function resolveSlot<TScope extends object>(
	content: () => TSlotContent<TScope> | undefined,
	scope: () => TScope,
): Accessor<JSX.Element | undefined> {
	const resolved = children(() => {
		const value = content()

		return isSlotFunction(value) ? value(liveScope(scope)) : value
	})

	return () => {
		const nodes = resolved()

		return hasSlot(nodes) ? nodes : undefined
	}
}

/**
 * Живой scope слота — объект с геттерами по ключам scope: каждый геттер берёт
 * своё значение из аксессора `scope` на каждое чтение. Его получают функции
 * всех слотов со scope: `resolveSlot` и проброс `relaySlot` собирают его сами,
 * а разметка, которая рисует слот `renderSlot`, отдаёт его так:
 * `renderSlot(props.trigger, liveScope(() => ({ … })))`.
 *
 * Свежий объект scope перезапускал бы функцию слота на каждую смену: и литерал
 * scope в разметке, и разворот слота читают его там, где зовут функцию, — и
 * Solid пересоздавал бы всё, что она нарисовала. Подсказку ручки Slider — на
 * каждый шаг, содержимое пункта ListBox — на каждый выбор, триггер Popover —
 * на каждое открытие: кнопка или поле внутри теряли бы фокус и состояние, а
 * при закрытии кликом по триггеру фокус с прежнего узла падал бы на `body`.
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
 * Scope элемента и добавка владельца одним объектом — живыми полями: ключ
 * scope — геттер, который на каждое чтение берёт то же поле scope, ключ
 * `extra` — значение поверх, как в спреде `{ ...scope, ...extra }`. Спред
 * прочёл бы все поля scope там, где его собирают, — в теле проброса, — и
 * перезапускал бы слот владельца на каждую смену scope элемента. Форму и тип
 * объекту здесь даёт спред вне слежения, и его значения тут же сменяют
 * геттеры.
 */
function joinScope<TScope extends object, TExtra extends object>(
	scope: TScope,
	extra: TExtra,
): TScope & TExtra {
	const joined = untrack(() => ({ ...scope, ...extra }))

	for (const key of Object.keys(scope)) {
		if (Object.hasOwn(extra, key)) continue

		Object.defineProperty(joined, key, {
			enumerable: true,
			get: () => Reflect.get(scope, key),
		})
	}

	return joined
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
 * Scope элемента живой (`resolveSlot` элемента), и проброс сливает его с
 * `extra` живыми полями, без спреда: слот владельца, прочитавший scope в
 * разметке (`scope.text`), переживает смену scope элемента — выбор пункта,
 * активацию таба — теми же узлами.
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

	return (scope) => renderSlot<TScope & TExtra>(content, joinScope(scope, extra))
}
