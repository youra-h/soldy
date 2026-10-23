/**
 * `<div is="so-list-box-group">` — элементы списка под общей подписью;
 * регистрирует модуль списка. docs/architecture.md, Layer 8d, «Коллекция».
 */

import { ListBoxGroupDescriptor } from '@soldy-ui/setup'
import type { IItemGroup } from '@soldy-ui/core'
import { ElementBase } from '../../../adapter'
import type { TElementClassOf, TElementType } from '../../../adapter'
import { listBoxGroupTemplate } from './list-box-group.template'
import { setupListBoxGroup } from './setup.component'

export const TListBoxGroupElement: TElementClassOf<
	typeof HTMLDivElement,
	typeof ListBoxGroupDescriptor,
	IItemGroup
> = ElementBase(HTMLDivElement, {
	descriptor: ListBoxGroupDescriptor,
	template: listBoxGroupTemplate,
	setup: setupListBoxGroup,
})

export type TListBoxGroupElementProps = TElementType<typeof TListBoxGroupElement>
