/**
 * `<span is="so-icon">` — иконка.
 *
 * Элемент — настоящий `<span>`, расширенный классом soldy (customized
 * built-in, см. `ElementBase`): тег ядра по умолчанию, строчный — его HTML
 * разрешает и в кнопке, и в подписи. Корень — сам элемент, как `<span
 * so-icon>` у Angular: классы размера, наборы (`aria-hidden`, а с именем —
 * `role="img"`), размер `width` и `height` — стилем от плагина раскладки — и
 * `so:element:ready` у него, как у любого элемента soldy.
 *
 * Корень иконки по роли в остальных адаптерах — сам `<svg>`, но атрибут `is`
 * расширяет только элементы HTML, и `<svg>` элементом soldy не сделать.
 * Поэтому рисунок — внутри корня: роль — свой атрибут элемента, а не проп ядра
 * (`<span is="so-icon" icon="close">`, `el.icon` рядом с `el.size`), как
 * `so-role-icon` у Angular, а `<svg>` по ней строит шаблон. Теме корень `span`
 * — то же, что корень `svg`: рисунок растянут на него, а блоком корень делает
 * правило темы.
 *
 * Разметка вынесена в icon.template.ts, жизненный цикл — в ElementBase.
 */

import { IconDescriptor } from '@soldy-ui/setup'
import type { IIcon } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementType } from '../../adapter'
import { iconTemplate } from './icon.template'
import { setupIcon } from './setup.component'

export const TIconElement = ElementBase(HTMLSpanElement, {
	descriptor: IconDescriptor,
	template: iconTemplate,
	attributes: ['icon'],
	setup: setupIcon,
})

defineElement('so-icon', TIconElement, 'span')

/**
 * `<span is="so-icon">` из JS: нативный `span`, своё элемента soldy (`ctrl`,
 * `state`), свойства пропов дескриптора вместе с пропсами его плагинов
 * (`aria_label`) — без тех, что у `span` уже есть, и без `HOST_PROPS`
 * (`TElementProps`), — и роль.
 */
export type TIconElementProps = TElementType<typeof TIconElement>
