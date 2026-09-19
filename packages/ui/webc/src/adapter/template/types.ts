/**
 * Контракт шаблона Web Components.
 *
 * Фреймворка нет, поэтому шаблон — это не разметка, а описание структуры плюс
 * привязки «проп → DOM-операция». Такое описание даёт то же, что даёт шаблон в
 * остальных адаптерах: вынесено в отдельный файл и не смешано с классом.
 *
 * Точечность обновлений берётся отсюда: подписка на связку (`subscribe`) уже сообщает,
 * КАКОЙ проп изменился, а привязка знает, за какие пропы она отвечает. Значит
 * при смене `text` не нужно трогать `className`.
 *
 * Структурные props (`rendered`, `tag`, `classes`, `visible`, `attrs`)
 * применяет сам базовый класс: они одинаковы у всех визуальных компонентов
 * soldy.
 */

import type { TInstanceState } from '@soldy/setup'

/**
 * Куда попадает содержимое слота.
 *
 * Два режима, потому что слоты соседствуют в одном родителе: `default` у Button
 * лежит ВНУТРИ `.s-button__text`, а `leading` — ПЕРЕД этим узлом. Режим `before`
 * позволяет обойтись без узлов-обёрток, которых нет в остальных пяти адаптерах:
 * лишний `<span>` вокруг иконки сломал бы селекторы темы.
 */
export type TSlotTarget = { mode: 'append'; node: HTMLElement } | { mode: 'before'; node: Node }

/** Точки распределения света: имя слота → куда класть содержимое. */
export type TSlotTargets = Record<string, TSlotTarget>

export interface ITemplateContext<TInstance = object> {
	/** Корневой элемент внутри хоста */
	root: HTMLElement
	/** Узел слота по умолчанию — там же, куда перенесён свет без атрибута slot */
	content: HTMLElement
	/** Свойства инстанса компонента со снимком через `valueOf()` */
	state: TInstanceState<TInstance>
	/** Задано ли пользователем содержимое именованного слота */
	hasSlot(name: string): boolean
}

/**
 * Привязка «проп → DOM-операция».
 *
 * `apply` — метод: общая привязка, объявленная для части инстанса (`ariaBinding`
 * для `{ aria }`), подходит шаблону любого компонента, у которого эта часть есть.
 */
export interface ITemplateBinding<TInstance = object> {
	/** Пропы, при изменении которых привязку надо применить */
	props: readonly string[]
	apply(ctx: ITemplateContext<TInstance>): void
}

export interface ITemplate<TInstance = object> {
	/** Имя тега корня из состояния */
	tag(state: TInstanceState<TInstance>): string

	/**
	 * Строит внутреннюю структуру корня и возвращает точки распределения света.
	 * Ключи обязаны совпадать с именами слотов из дескриптора — это проверяет
	 * conformance-тест.
	 */
	create(root: HTMLElement): TSlotTargets

	bindings: readonly ITemplateBinding<TInstance>[]
}

/** Объявление привязки: bind('text', ctx => ...) или bind(['a','b'], ...) */
export function bind<TInstance>(
	props: string | readonly string[],
	apply: (ctx: ITemplateContext<TInstance>) => void,
): ITemplateBinding<TInstance> {
	return {
		props: typeof props === 'string' ? [props] : props,
		apply,
	}
}
