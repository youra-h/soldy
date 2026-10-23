/**
 * `<button is="so-button">` — настоящая кнопка: форма, `submitter`, фокус и
 * доступность нативные. На других тегах — тот же Button под своим именем
 * (`registerButtonTag`). docs/architecture.md, Layer 8d, «Элемент soldy —
 * нативный элемент своего тега».
 */

import { ButtonDescriptor } from '@soldy-ui/setup'
import type { IButton } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementClassOf, TElementOf } from '../../adapter'
import { buttonTemplate } from './button.template'
import { setupButton } from './setup.component'

/** Одно описание на все теги Button. */
const BUTTON = {
	descriptor: ButtonDescriptor,
	template: buttonTemplate,
	setup: setupButton,
}

export const TButtonElement: TElementClassOf<
	typeof HTMLButtonElement,
	typeof ButtonDescriptor,
	IButton
> = ElementBase(HTMLButtonElement, BUTTON)

defineElement('so-button', TButtonElement, 'button')

/** `div` — строка элемента ListBox, тега и пункта меню; `span` — строка опции Select. */
export type TButtonTag = 'div' | 'span'

export type TButtonTagClass<K extends TButtonTag> = TElementClassOf<
	new () => HTMLElementTagNameMap[K],
	typeof ButtonDescriptor,
	IButton
>

function variant<K extends TButtonTag>(
	Native: new () => HTMLElementTagNameMap[K],
): TButtonTagClass<K> {
	return ElementBase(Native, BUTTON)
}

/** Класс тега создаётся и регистрируется при первом обращении; чужой нативный класс не компилируется. */
function registration<K extends TButtonTag>(
	tag: K,
	Native: new () => HTMLElementTagNameMap[K],
): () => TButtonTagClass<K> {
	let element: TButtonTagClass<K> | undefined

	return () => {
		if (!element) {
			element = variant(Native)
			defineElement(`so-button-${tag}`, element, tag)
		}

		return element
	}
}

const REGISTRATIONS: { readonly [K in TButtonTag]: () => TButtonTagClass<K> } = {
	div: registration('div', HTMLDivElement),
	span: registration('span', HTMLSpanElement),
}

/** `<div is="so-button-div">`, `<span is="so-button-span">` — регистрирует разметка, где тег нужен. */
export function registerButtonTag<K extends TButtonTag>(tag: K): TButtonTagClass<K> {
	return REGISTRATIONS[tag]()
}

/** У `div` и `span` своего `disabled` нет, и там это свойство пропа. */
export type TButtonElementProps<TNative extends HTMLElement = HTMLButtonElement> = TElementOf<
	TNative,
	typeof ButtonDescriptor,
	IButton
>
