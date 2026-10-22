/**
 * `<div is="so-select-item">` — опция Select: корень, внутри строка — Button на
 * `span`.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `SoldyElement`): тег ядра по умолчанию. Корень несёт классы,
 * `attrs`, `dataset` (тема читает с него `data-content-fit`) и место в
 * коллекции (`order`): список — флексбокс, и опция стоит по номеру в
 * коллекции. Строка — узел поля корня (`control`): статические атрибуты
 * разметки опции, кроме `class`, `style`, `is`, `slot` и входов пропов, база
 * при построении переносит на неё — `title`, `aria-label`, `data-*`
 * потребителя стоят на строке, и там они главнее `aria` опции.
 *
 * Пропсы фасада — `selected` — тоже атрибут-вход и свойство элемента:
 * дескриптор фасада элемент называет рядом со своим. Регистрирует элемент
 * модуль Select (`Select.element.ts`).
 *
 * Разметка вынесена в select-item.template.ts, жизненный цикл — в
 * SoldyElement.
 */

import { SelectCollectionItemDescriptor, SelectItemDescriptor } from '@soldy-ui/setup'
import type { ISelectItem, TSelectItemCollectionFacade } from '@soldy-ui/core'
import { SoldyElement } from '../../../adapter'
import type { ISoldyElement, TSoldyElementProps } from '../../../adapter'
import { selectItemTemplate } from './select-item.template'
import { setupSelectItem } from './setup.component'

export const TSelectItemElement = SoldyElement(HTMLDivElement, {
	descriptor: SelectItemDescriptor(),
	facade: SelectCollectionItemDescriptor(),
	template: selectItemTemplate,
	root: { sets: ['attrs', 'dataset'], order: true, control: true },
	setup: setupSelectItem,
})

/**
 * `<div is="so-select-item">` из JS: нативный `div`, своё элемента soldy
 * (`ctrl`, `state` — вместе со свойствами фасада) и свойства пропов
 * дескриптора вместе с пропсами его плагинов и фасада (`selected`) — без тех,
 * что у `div` уже есть, и без `HOST_PROPS` (`TSoldyElementProps`).
 */
export type TSelectItemElementProps = HTMLDivElement &
	ISoldyElement<ISelectItem, TSelectItemCollectionFacade> &
	TSoldyElementProps<typeof SelectItemDescriptor, HTMLDivElement>
