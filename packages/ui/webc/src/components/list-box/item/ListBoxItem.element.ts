/**
 * `<div is="so-list-box-item">` — элемент списка: корень, внутри строка —
 * Button на `div`.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`): тег ядра по умолчанию. Корень несёт классы,
 * `attrs`, `dataset` (тема читает с него `data-content-fit`) и место в
 * коллекции (`order`): ряд элементов — флексбокс, и элемент стоит по номеру в
 * коллекции. Строка — узел поля корня (`control`): статические атрибуты
 * разметки элемента, кроме `class`, `style`, `is`, `slot` и входов пропов,
 * база при построении переносит на неё — `id`, `title`, `aria-label`, `data-*`
 * потребителя стоят на строке, и там они главнее `aria` элемента.
 *
 * Пропсы фасада — `selected` — тоже атрибут-вход и свойство элемента:
 * дескриптор фасада элемент называет рядом со своим. Регистрирует элемент
 * модуль списка (`ListBox.element.ts`).
 *
 * Разметка вынесена в list-box-item.template.ts, жизненный цикл — в
 * ElementBase.
 */

import { ListBoxCollectionItemDescriptor, ListBoxItemDescriptor } from '@soldy-ui/setup'
import type { IListBoxItem, TListBoxItemCollectionFacade } from '@soldy-ui/core'
import { ElementBase } from '../../../adapter'
import type { IElementBase, TElementProps } from '../../../adapter'
import { listBoxItemTemplate } from './list-box-item.template'
import { setupListBoxItem } from './setup.component'

export const TListBoxItemElement = ElementBase(HTMLDivElement, {
	descriptor: ListBoxItemDescriptor(),
	facade: ListBoxCollectionItemDescriptor(),
	template: listBoxItemTemplate,
	root: { strategy: 'host', sets: ['attrs', 'dataset'], order: true, control: true },
	setup: setupListBoxItem,
})

/**
 * `<div is="so-list-box-item">` из JS: нативный `div`, своё элемента soldy
 * (`ctrl`, `state` — вместе со свойствами фасада) и свойства пропов
 * дескриптора вместе с пропсами его плагинов и фасада (`selected`) — без тех,
 * что у `div` уже есть, и без `HOST_PROPS` (`TElementProps`).
 */
export type TListBoxItemElementProps = HTMLDivElement &
	IElementBase<IListBoxItem, TListBoxItemCollectionFacade> &
	TElementProps<typeof ListBoxItemDescriptor, HTMLDivElement>
