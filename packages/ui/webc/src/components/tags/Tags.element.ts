/**
 * `<div is="so-tags">` — набор тегов: крестики закрытия, выбор по желанию.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`): тег ядра по умолчанию. На корне — все три
 * набора ядра, как у Vue: роль набора (`list` без выбора, `listbox` с ним) и
 * `data-overflow` для темы. Теги — свет набора в слоте по умолчанию или данные
 * (`el.items`, `el.engine`).
 *
 * Контекстов два — свой и фасада коллекции (`setupTags`), и пропсы фасада
 * (`items`, `mode`, `engine`, `trackBy`) — атрибуты-входы и свойства того же
 * элемента: дескриптор фасада элемент называет рядом со своим. Движок набора
 * его сборка опускает лифтом своему хосту, и теги находят его вверх по
 * документу.
 *
 * Модуль регистрирует и тег. Разметку, ожившую при регистрации, база собирает
 * по месту (`deferral.ts`): набор — раньше тегов в нём. Строку тега — Button на
 * `div` (`<div is="so-button-div">`) — регистрирует фабрика кнопки там, где
 * она впервые нужна, — модуль шаблона тега.
 *
 * Разметка вынесена в tags.template.ts, жизненный цикл — в ElementBase.
 */

import { TagsCollectionDescriptor, TagsDescriptor } from '@soldy-ui/setup'
import type { ITags, TTagsCollectionFacade } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { IElementBase, TElementProps } from '../../adapter'
import { TTagsItemElement } from './item'
import { tagsTemplate } from './tags.template'
import { setupTags } from './setup.component'

export const TTagsElement = ElementBase(HTMLDivElement, {
	descriptor: TagsDescriptor(),
	facade: TagsCollectionDescriptor(),
	template: tagsTemplate,
	setup: setupTags,
})

defineElement('so-tags', TTagsElement, 'div')
defineElement('so-tags-item', TTagsItemElement, 'div')

/**
 * `<div is="so-tags">` из JS: нативный `div`, своё элемента soldy (`ctrl`,
 * `state` — вместе со свойствами фасада) и свойства пропов дескриптора вместе
 * с пропсами его плагинов и фасада (`items`, `mode`, `engine`) — без тех, что у
 * `div` уже есть, и без `HOST_PROPS` (`TElementProps`).
 */
export type TTagsElementProps = HTMLDivElement &
	IElementBase<ITags, TTagsCollectionFacade> &
	TElementProps<typeof TagsDescriptor, HTMLDivElement>
