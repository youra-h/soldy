/**
 * `<span is="so-popover">` — панель с произвольным содержимым у триггера:
 * немодальный диалог.
 *
 * Элемент — настоящий `<span>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`): тег ядра по умолчанию. Строчный корень —
 * обёртка триггера и якорь панели: поповер встаёт и в строку текста, и в ряд
 * тегов. Панель — деталь Frame: в цель её уводит база самого Frame, на месте в
 * корне остаётся якорь-комментарий, поэтому в корне лежит только триггер, и
 * прямоугольник корня совпадает с его прямоугольником.
 *
 * Триггер — элемент потребителя в слоте `trigger`:
 * `<span is="so-popover"><button is="so-button" slot="trigger">Ещё</button>…</span>`.
 * Связку с панелью (`aria-haspopup`, `aria-expanded`, `aria-controls`) и вид
 * «нажат» (`data-selected`) он получает сам — шаблон кладёт их на первый
 * элемент слота: scope у слотов нет, и привязать их потребитель не может.
 *
 * На корне из наборов ядра — `attrs` и `dataset` (`data-open`): ARIA у панели
 * и у триггера. Классы, наборы и скрытие корня раскладывает база.
 *
 * Поповер на другом теге — тот же Popover под своим именем: одно имя элемента
 * расширяет один тег (`customElements.define` с `extends`). Его регистрирует
 * фабрика `registerPopoverTag` там, где тег впервые нужен разметке
 * библиотеки: `<div is="so-popover-div">` — заголовок месяца Calendar с
 * панелью выбора месяца и года: панель лежит в корне поповера, а в строчном
 * `span` блочной разметке не место. Имя — имя компонента и тег через дефис,
 * как у Button на другом теге. Описание элемента у всех тегов одно
 * (`POPOVER`), отличается только нативный класс.
 *
 * Разметка вынесена в popover.template.ts, жизненный цикл — в ElementBase.
 */

import { PopoverDescriptor } from '@soldy-ui/setup'
import type { IPopover } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { IElementSpec, TElementClassOf, TElementOf } from '../../adapter'
import { popoverTemplate } from './popover.template'
import { setupPopover, type TPopoverOutputs } from './setup.component'

/** Описание элемента Popover — одно на все его теги: дескриптор, шаблон, корень и setup. */
const POPOVER = {
	descriptor: PopoverDescriptor,
	template: popoverTemplate,
	root: { strategy: 'host', sets: ['attrs', 'dataset'] },
	setup: setupPopover,
} satisfies IElementSpec<IPopover, unknown, TPopoverOutputs, unknown, typeof PopoverDescriptor>

export const TPopoverElement: TElementClassOf<
	typeof HTMLSpanElement,
	typeof PopoverDescriptor,
	IPopover
> = ElementBase(HTMLSpanElement, POPOVER)

defineElement('so-popover', TPopoverElement, 'span')

/**
 * Теги, на которых Popover регистрируется ещё раз (`registerPopoverTag`), —
 * сверх своего `span`. Тег здесь — значит, у поповера на нём есть место в
 * разметке библиотеки: `div` — заголовок месяца Calendar, корень панели
 * выбора месяца и года.
 */
export type TPopoverTag = 'div'

/** Класс Popover на теге `K`: нативный класс тега и своё элемента soldy. */
export type TPopoverTagClass<K extends TPopoverTag> = TElementClassOf<
	new () => HTMLElementTagNameMap[K],
	typeof PopoverDescriptor,
	IPopover
>

function variant<K extends TPopoverTag>(
	Native: new () => HTMLElementTagNameMap[K],
): TPopoverTagClass<K> {
	return ElementBase(Native, POPOVER)
}

/**
 * Регистрация Popover на теге: класс на нативном классе тега создаётся и
 * регистрируется при первом обращении, каждое следующее отдаёт тот же — у
 * тега класс один. Тип сверяет нативный класс с тегом, как у Button.
 */
function registration<K extends TPopoverTag>(
	tag: K,
	Native: new () => HTMLElementTagNameMap[K],
): () => TPopoverTagClass<K> {
	let element: TPopoverTagClass<K> | undefined

	return () => {
		if (!element) {
			element = variant(Native)
			defineElement(`so-popover-${tag}`, element, tag)
		}

		return element
	}
}

/** Регистрация каждого тега: тег без неё не компилируется (`TPopoverTag`). */
const REGISTRATIONS: { readonly [K in TPopoverTag]: () => TPopoverTagClass<K> } = {
	div: registration('div', HTMLDivElement),
}

/**
 * Popover на теге `tag` — `<div is="so-popover-div">`: класс регистрируется
 * при первом вызове, и каждый следующий отдаёт тот же. Зовёт её разметка там,
 * где тег впервые нужен; класс нужен ей для проверки вида детали
 * (`createDetail`), потребителю — для `instanceof`.
 *
 * Своей логики у поповера на теге нет: описание элемента — то же, что у
 * `<span is="so-popover">` (`POPOVER`), повторяется только регистрация.
 */
export function registerPopoverTag<K extends TPopoverTag>(tag: K): TPopoverTagClass<K> {
	return REGISTRATIONS[tag]()
}

/**
 * Popover из JS: нативный элемент тега (по умолчанию `<span is="so-popover">`,
 * `TPopoverElementProps<HTMLDivElement>` — `<div is="so-popover-div">`), своё
 * элемента soldy (`ctrl`, `state`) и свойства пропов дескриптора вместе с
 * пропсами его плагинов (`aria_label`) — без тех, что у тега уже есть, и без
 * `HOST_PROPS` (`TElementProps`).
 */
export type TPopoverElementProps<TNative extends HTMLElement = HTMLSpanElement> = TElementOf<
	TNative,
	typeof PopoverDescriptor,
	IPopover
>
