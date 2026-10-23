/**
 * `<div is="so-tags-item">` — тег: корень — пилюля, строка — Button на `div` и
 * поле корня (атрибуты разметки тега едут на неё), крестик — сосед строки.
 * Место — `order`: ряд тегов — флексбокс. docs/architecture.md, Layer 8d,
 * «Набор тегов и поле выбора».
 */

import { TagsCollectionItemDescriptor, TagsItemDescriptor } from '@soldy-ui/setup'
import type { ITagsItem, TTagsItemCollectionFacade } from '@soldy-ui/core'
import { ElementBase } from '../../../adapter'
import type { TElementClassOf, TElementType } from '../../../adapter'
import { setupTagsItem } from './setup.component'
import { tagsItemTemplate } from './tags-item.template'

export const TTagsItemElement: TElementClassOf<
	typeof HTMLDivElement,
	typeof TagsItemDescriptor,
	ITagsItem,
	TTagsItemCollectionFacade
> = ElementBase(HTMLDivElement, {
	descriptor: TagsItemDescriptor,
	facade: TagsCollectionItemDescriptor,
	template: tagsItemTemplate,
	root: { strategy: 'host', sets: ['attrs', 'dataset'], order: true, control: true },
	setup: setupTagsItem,
})

export type TTagsItemElementProps = TElementType<typeof TTagsItemElement>
