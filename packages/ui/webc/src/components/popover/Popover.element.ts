/**
 * `<span is="so-popover">` — немодальная панель у триггера. Строчный корень —
 * обёртка триггера и якорь панели; на других тегах — тот же Popover под своим
 * именем (`registerPopoverTag`). docs/architecture.md, Layer 8d, «Панель у
 * триггера».
 */

import { PopoverDescriptor } from '@soldy-ui/setup'
import type { IPopover } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { IElementSpec, TElementClassOf, TElementOf } from '../../adapter'
import { popoverTemplate } from './popover.template'
import { setupPopover, type TPopoverOutputs } from './setup.component'

/** Одно описание на все теги Popover. */
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

/** `div` — заголовок месяца Calendar: панель выбора лежит в корне, а в `span` блочной разметке не место. */
export type TPopoverTag = 'div'

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

/** Класс тега создаётся и регистрируется при первом обращении; чужой нативный класс не компилируется. */
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

const REGISTRATIONS: { readonly [K in TPopoverTag]: () => TPopoverTagClass<K> } = {
	div: registration('div', HTMLDivElement),
}

/** `<div is="so-popover-div">` — регистрирует разметка, где тег нужен. */
export function registerPopoverTag<K extends TPopoverTag>(tag: K): TPopoverTagClass<K> {
	return REGISTRATIONS[tag]()
}

export type TPopoverElementProps<TNative extends HTMLElement = HTMLSpanElement> = TElementOf<
	TNative,
	typeof PopoverDescriptor,
	IPopover
>
