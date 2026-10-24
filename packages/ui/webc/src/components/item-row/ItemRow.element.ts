/**
 * Строка элемента коллекции — деталь разметки ListBox.Item, опции Select,
 * пунктов меню и тега: `<div is="so-item-row-div">`, у опции Select —
 * `<span is="so-item-row-span">`. Свойства, шаблон и разметка — Button
 * (`buttonTemplate`), сборка своя — по `ItemRowDescriptor`: её экземпляр
 * (`TItemRow`) роль и остановку Tab себе не пишет, их несёт набор `aria`
 * элемента, который разметка кладёт на строку.
 *
 * Экземпляр создаёт подключение элемента и отпускает его отключение: строка
 * живёт, пока стоит в документе, и окно `Virtual` держит их столько, сколько
 * показывает.
 *
 * Своего элемента на теге по умолчанию (`<button>`) у строки нет: на кнопке
 * выключенный элемент терял бы фокус и клик. Только теги строк, под именем с
 * тегом (AGENTS.md, «Элемент Web Components на другом теге»).
 */

import { ItemRowDescriptor } from '@soldy-ui/setup'
import type { IButton } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementClassOf, TElementOf } from '../../adapter'
import { buttonTemplate } from '../button/button.template'
import { setupItemRow } from './setup.component'

/** Одно описание на все теги строки. */
const ITEM_ROW = {
	descriptor: ItemRowDescriptor,
	template: buttonTemplate,
	setup: setupItemRow,
}

/** `div` — строка элемента ListBox, тега и пункта меню; `span` — строка опции Select. */
export type TItemRowTag = 'div' | 'span'

export type TItemRowTagClass<K extends TItemRowTag> = TElementClassOf<
	new () => HTMLElementTagNameMap[K],
	typeof ItemRowDescriptor,
	IButton
>

function variant<K extends TItemRowTag>(
	Native: new () => HTMLElementTagNameMap[K],
): TItemRowTagClass<K> {
	return ElementBase(Native, ITEM_ROW)
}

/** Класс тега создаётся и регистрируется при первом обращении; чужой нативный класс не компилируется. */
function registration<K extends TItemRowTag>(
	tag: K,
	Native: new () => HTMLElementTagNameMap[K],
): () => TItemRowTagClass<K> {
	let element: TItemRowTagClass<K> | undefined

	return () => {
		if (!element) {
			element = variant(Native)
			defineElement(`so-item-row-${tag}`, element, tag)
		}

		return element
	}
}

const REGISTRATIONS: { readonly [K in TItemRowTag]: () => TItemRowTagClass<K> } = {
	div: registration('div', HTMLDivElement),
	span: registration('span', HTMLSpanElement),
}

/** `<div is="so-item-row-div">`, `<span is="so-item-row-span">` — регистрирует разметка, где тег нужен. */
export function registerItemRowTag<K extends TItemRowTag>(tag: K): TItemRowTagClass<K> {
	return REGISTRATIONS[tag]()
}

/** Строка — на `div` или `span`: своего `disabled` у них нет, и там это свойство пропа. */
export type TItemRowElementProps<TNative extends HTMLElement> = TElementOf<
	TNative,
	typeof ItemRowDescriptor,
	IButton
>
