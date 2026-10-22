/**
 * `<div is="so-menu-radio-group">` — переключатели меню под общей подписью и
 * своё значение, как `Menu.RadioGroup` у Vue.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `SoldyElement`): тег ядра по умолчанию. Разметка — та же, что
 * у группы меню: подпись и пункты, `role="group"` и имя от подписи. Значение —
 * `value` отмеченного переключателя, атрибут-вход и свойство элемента; о его
 * смене группа сообщает `so:change:value`.
 *
 * Переключатель берёт группу при сборке. Регистрирует элемент модуль меню, а
 * разметку, ожившую при регистрации, база собирает по месту: группу — раньше
 * переключателей её света.
 *
 * Разметка вынесена в menu-radio-group.template.ts, жизненный цикл — в
 * SoldyElement.
 */

import { MenuRadioGroupDescriptor } from '@soldy-ui/setup'
import type { IMenuRadioGroup } from '@soldy-ui/core'
import { SoldyElement } from '../../../adapter'
import type { ISoldyElement, TSoldyElementProps } from '../../../adapter'
import { menuRadioGroupTemplate } from './menu-radio-group.template'
import { setupMenuRadioGroup } from './setup.component'

export const TMenuRadioGroupElement = SoldyElement(HTMLDivElement, {
	descriptor: MenuRadioGroupDescriptor(),
	template: menuRadioGroupTemplate,
	setup: setupMenuRadioGroup,
})

/**
 * `<div is="so-menu-radio-group">` из JS: нативный `div`, своё элемента soldy и
 * свойства пропов дескриптора (`label`, `value`) — без тех, что у `div` уже
 * есть, и без `HOST_PROPS` (`TSoldyElementProps`).
 */
export type TMenuRadioGroupElementProps = HTMLDivElement &
	ISoldyElement<IMenuRadioGroup> &
	TSoldyElementProps<typeof MenuRadioGroupDescriptor, HTMLDivElement>
