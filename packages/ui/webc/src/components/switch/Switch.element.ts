/**
 * `<span is="so-switch">` — переключатель: корень и нативный
 * `<input type="checkbox">` внутри, рядом — дорожка с ручкой.
 *
 * Элемент — настоящий `<span>`, расширенный классом soldy (customized
 * built-in, см. `SoldyElement`): тег ядра по умолчанию, строчный —
 * переключатель кладут в подпись `Label`. Поле — узел шаблона в обычном DOM
 * страницы, поэтому форма видит его сама.
 *
 * Корень с полем (`control` в описании корня), как у CheckBox: на корне из
 * наборов ядра — `attrs` (`dir`) и `dataset` (`data-disabled`,
 * `data-invalid`), по нему тема красит дорожку и подпись поля формы `Field`;
 * `aria` с `role="switch"` — на поле.
 * Статические атрибуты разметки, кроме `class`, `style`, `is`, `slot` и
 * входов пропов, база при построении переносит на поле, а `id` — проп поля.
 *
 * Разметка вынесена в switch.template.ts, жизненный цикл — в SoldyElement.
 */

import { SwitchDescriptor } from '@soldy-ui/setup'
import type { ISwitch } from '@soldy-ui/core'
import { SoldyElement, defineElement } from '../../adapter'
import type { ISoldyElement, TSoldyElementProps } from '../../adapter'
import { switchTemplate } from './switch.template'
import { setupSwitch } from './setup.component'

export const TSwitchElement = SoldyElement(HTMLSpanElement, {
	descriptor: SwitchDescriptor(),
	template: switchTemplate,
	root: { sets: ['attrs', 'dataset'], control: true },
	setup: setupSwitch,
})

defineElement('so-switch', TSwitchElement, 'span')

/**
 * `<span is="so-switch">` из JS: нативный `span`, своё элемента soldy (`ctrl`,
 * `state`) и свойства пропов дескриптора вместе с пропсами его плагинов
 * (`aria_label`) — без тех, что у `span` уже есть (`id` — собственный `id`
 * корня), и без `HOST_PROPS` (`TSoldyElementProps`).
 */
export type TSwitchElementProps = HTMLSpanElement &
	ISoldyElement<ISwitch> &
	TSoldyElementProps<typeof SwitchDescriptor, HTMLSpanElement>
