/**
 * `<div is="so-tags-item">` — тег: корень, внутри строка — Button на `div` — и
 * кнопка закрытия рядом с ней.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`): тег ядра по умолчанию. Корень — пилюля тега:
 * классы, `attrs`, `dataset` (тема красит выбранный тег по `data-selected`) и
 * место в коллекции (`order`): ряд тегов — флексбокс, и тег стоит по номеру в
 * коллекции. Строка — узел поля корня (`control`): статические атрибуты
 * разметки тега, кроме `class`, `style`, `is`, `slot` и входов пропов, база при
 * построении переносит на неё — `id`, `title`, `aria-label`, `data-*`
 * потребителя стоят на строке, и там они главнее `aria` тега.
 *
 * Пропсы фасада — `selected` — тоже атрибут-вход и свойство элемента:
 * дескриптор фасада элемент называет рядом со своим. Регистрирует элемент
 * модуль набора (`Tags.element.ts`).
 *
 * Разметка вынесена в tags-item.template.ts, жизненный цикл — в ElementBase.
 */

import { TagsCollectionItemDescriptor, TagsItemDescriptor } from '@soldy-ui/setup'
import { ElementBase } from '../../../adapter'
import type { TElementType } from '../../../adapter'
import { setupTagsItem } from './setup.component'
import { tagsItemTemplate } from './tags-item.template'

export const TTagsItemElement = ElementBase(HTMLDivElement, {
	descriptor: TagsItemDescriptor,
	facade: TagsCollectionItemDescriptor,
	template: tagsItemTemplate,
	root: { strategy: 'host', sets: ['attrs', 'dataset'], order: true, control: true },
	setup: setupTagsItem,
})

/**
 * `<div is="so-tags-item">` из JS: нативный `div`, своё элемента soldy (`ctrl`,
 * `state` — вместе со свойствами фасада) и свойства пропов дескриптора вместе
 * с пропсами его плагинов и фасада (`selected`) — без тех, что у `div` уже
 * есть, и без `HOST_PROPS` (`TElementProps`).
 */
export type TTagsItemElementProps = TElementType<typeof TTagsItemElement>
