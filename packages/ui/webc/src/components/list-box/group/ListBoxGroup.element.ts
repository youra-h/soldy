/**
 * `<div is="so-list-box-group">` — элементы списка под общей подписью, как
 * `ListBox.Group` у Vue.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`): тег ядра по умолчанию. Классы и три набора
 * ядра — `role="group"` и `aria-labelledby` на подпись — база раскладывает на
 * него, рядом с атрибутами потребителя. Подпись и её набор рисует шаблон.
 *
 * Регистрирует элемент модуль списка (`ListBox.element.ts`).
 *
 * Разметка вынесена в list-box-group.template.ts, жизненный цикл — в
 * ElementBase.
 */

import { ListBoxGroupDescriptor } from '@soldy-ui/setup'
import type { IItemGroup } from '@soldy-ui/core'
import { ElementBase } from '../../../adapter'
import type { IElementBase, TElementProps } from '../../../adapter'
import { listBoxGroupTemplate } from './list-box-group.template'
import { setupListBoxGroup } from './setup.component'

export const TListBoxGroupElement = ElementBase(HTMLDivElement, {
	descriptor: ListBoxGroupDescriptor(),
	template: listBoxGroupTemplate,
	setup: setupListBoxGroup,
})

/**
 * `<div is="so-list-box-group">` из JS: нативный `div`, своё элемента soldy и
 * свойства пропов дескриптора (`label`) — без тех, что у `div` уже есть, и без
 * `HOST_PROPS` (`TElementProps`).
 */
export type TListBoxGroupElementProps = HTMLDivElement &
	IElementBase<IItemGroup> &
	TElementProps<typeof ListBoxGroupDescriptor, HTMLDivElement>
