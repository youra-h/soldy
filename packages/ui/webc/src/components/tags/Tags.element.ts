/**
 * `<div is="so-tags">` — набор тегов: теги разметкой в слоте по умолчанию или
 * данными (`items`, `engine`). Модуль регистрирует и тег.
 * docs/architecture.md, Layer 8d, «Набор тегов и поле выбора».
 */

import { TagsCollectionDescriptor, TagsDescriptor } from '@soldy-ui/setup'
import type { ITags, TTagsCollectionFacade } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementClassOf, TElementType } from '../../adapter'
import { TTagsItemElement } from './item'
import { tagsTemplate } from './tags.template'
import { setupTags } from './setup.component'

export const TTagsElement: TElementClassOf<
	typeof HTMLDivElement,
	typeof TagsDescriptor,
	ITags,
	TTagsCollectionFacade
> = ElementBase(HTMLDivElement, {
	descriptor: TagsDescriptor,
	facade: TagsCollectionDescriptor,
	template: tagsTemplate,
	setup: setupTags,
})

defineElement('so-tags', TTagsElement, 'div')
defineElement('so-tags-item', TTagsItemElement, 'div')

export type TTagsElementProps = TElementType<typeof TTagsElement>
