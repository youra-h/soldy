/**
 * `<div is="so-select-item">` — опция Select: корень с местом в коллекции
 * (`order`, список — флексбокс), его поле — строка, Button на `span`;
 * регистрирует модуль Select. docs/architecture.md, Layer 8d, «Набор тегов и
 * поле выбора».
 */

import { SelectCollectionItemDescriptor, SelectItemDescriptor } from '@soldy-ui/setup'
import type { ISelectItem, TSelectItemCollectionFacade } from '@soldy-ui/core'
import { ElementBase } from '../../../adapter'
import type { TElementClassOf, TElementType } from '../../../adapter'
import { selectItemTemplate } from './select-item.template'
import { setupSelectItem } from './setup.component'

export const TSelectItemElement: TElementClassOf<
	typeof HTMLDivElement,
	typeof SelectItemDescriptor,
	ISelectItem,
	TSelectItemCollectionFacade
> = ElementBase(HTMLDivElement, {
	descriptor: SelectItemDescriptor,
	facade: SelectCollectionItemDescriptor,
	template: selectItemTemplate,
	root: { strategy: 'host', sets: ['attrs', 'dataset'], order: true, control: true },
	setup: setupSelectItem,
})

export type TSelectItemElementProps = TElementType<typeof TSelectItemElement>
