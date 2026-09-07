/**
 * Контракт шаблона Web Components.
 *
 * Фреймворка нет, поэтому шаблон — это не разметка, а описание структуры плюс
 * привязки «проп → DOM-операция». Такое описание даёт то же, что даёт шаблон в
 * остальных адаптерах: вынесено в отдельный файл и не смешано с классом.
 *
 * Точечность обновлений берётся отсюда: `useSyncProps` уже сообщает, КАКОЙ
 * проп изменился, а привязка знает, за какие пропы она отвечает. Значит при
 * смене `text` не нужно трогать `className`.
 *
 * Структурные props (`rendered`, `tag`, `classes`, `visible`) применяет сам
 * базовый класс: они одинаковы у всех визуальных компонентов soldy.
 */

import type { TWebcState } from '../runtime/useSyncProps'

/**
 * Куда попадает содержимое слота.
 *
 * Два режима, потому что слоты соседствуют в одном родителе: `default` у Button
 * лежит ВНУТРИ `.s-button__text`, а `leading` — ПЕРЕД этим узлом. Режим `before`
 * позволяет обойтись без узлов-обёрток, которых нет в остальных пяти адаптерах:
 * лишний `<span>` вокруг иконки сломал бы селекторы темы.
 */
export type TSlotTarget =
	| { mode: 'append'; node: HTMLElement }
	| { mode: 'before'; node: Node }

/** Точки распределения света: имя слота → куда класть содержимое. */
export type TSlotTargets = Record<string, TSlotTarget>

export interface ITemplateContext {
	/** Корневой элемент внутри хоста */
	root: HTMLElement
	/** Узел слота по умолчанию — там же, куда перенесён свет без атрибута slot */
	content: HTMLElement
	state: TWebcState
	/** Задано ли пользователем содержимое именованного слота */
	hasSlot(name: string): boolean
}

export interface ITemplateBinding {
	/** Пропы, при изменении которых привязку надо применить */
	props: readonly string[]
	apply(ctx: ITemplateContext): void
}

export interface ITemplate {
	/** Имя тега корня из состояния */
	tag(state: TWebcState): string

	/**
	 * Строит внутреннюю структуру корня и возвращает точки распределения света.
	 * Ключи обязаны совпадать с именами слотов из дескриптора — это проверяет
	 * conformance-тест.
	 */
	create(root: HTMLElement): TSlotTargets

	bindings: readonly ITemplateBinding[]
}

/** Объявление привязки: bind('text', ctx => ...) или bind(['a','b'], ...) */
export function bind(
	props: string | readonly string[],
	apply: (ctx: ITemplateContext) => void,
): ITemplateBinding {
	return {
		props: typeof props === 'string' ? [props] : props,
		apply,
	}
}
