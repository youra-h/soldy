/**
 * `<div is="so-list-box-item">` — элемент списка; строка внутри — Button на
 * `div`, поле корня (`control`). Регистрирует модуль списка.
 * docs/architecture.md, Layer 8d, «Коллекция».
 */

import { ListBoxCollectionItemDescriptor, ListBoxItemDescriptor } from '@soldy-ui/setup'
import type { IListBoxItem, TListBoxItemCollectionFacade } from '@soldy-ui/core'
import { ElementBase } from '../../../adapter'
import type { TElementClassOf, TElementType } from '../../../adapter'
import { listBoxItemTemplate } from './list-box-item.template'
import { setupListBoxItem } from './setup.component'

export const TListBoxItemElement: TElementClassOf<
	typeof HTMLDivElement,
	typeof ListBoxItemDescriptor,
	IListBoxItem,
	TListBoxItemCollectionFacade
> = ElementBase(HTMLDivElement, {
	descriptor: ListBoxItemDescriptor,
	facade: ListBoxCollectionItemDescriptor,
	template: listBoxItemTemplate,
	root: { strategy: 'host', sets: ['attrs', 'dataset'], order: true, control: true },
	setup: setupListBoxItem,
})

export type TListBoxItemElementProps = TElementType<typeof TListBoxItemElement>
