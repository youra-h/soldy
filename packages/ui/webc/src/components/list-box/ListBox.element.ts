/**
 * `<div is="so-list-box">` — список с выбором; узел списка внутри — поле корня
 * (`control`) и остановка Tab. Модуль регистрирует и части — группу и элемент.
 * docs/architecture.md, Layer 8d, «Коллекция».
 */

import { ListBoxCollectionDescriptor, ListBoxDescriptor } from '@soldy-ui/setup'
import type { IListBox, TListBoxCollectionFacade } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementClassOf, TElementType } from '../../adapter'
import { TListBoxItemElement } from './item'
import { TListBoxGroupElement } from './group'
import { listBoxTemplate } from './list-box.template'
import { setupListBox } from './setup.component'

export const TListBoxElement: TElementClassOf<
	typeof HTMLDivElement,
	typeof ListBoxDescriptor,
	IListBox,
	TListBoxCollectionFacade
> = ElementBase(HTMLDivElement, {
	descriptor: ListBoxDescriptor,
	facade: ListBoxCollectionDescriptor,
	template: listBoxTemplate,
	root: { strategy: 'host', sets: ['attrs', 'dataset'], control: true },
	setup: setupListBox,
})

defineElement('so-list-box', TListBoxElement, 'div')
defineElement('so-list-box-group', TListBoxGroupElement, 'div')
defineElement('so-list-box-item', TListBoxItemElement, 'div')

export type TListBoxElementProps = TElementType<typeof TListBoxElement>
