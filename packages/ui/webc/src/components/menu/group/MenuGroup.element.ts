/**
 * `<div is="so-menu-group">` — пункты меню под общей подписью, как
 * `Menu.Group` у Vue.
 *
 * Элемент — настоящий `<div>`, расширенный классом soldy (customized
 * built-in, см. `SoldyElement`): тег ядра по умолчанию. Классы и три набора
 * ядра — `role="group"` и `aria-labelledby` на подпись — база раскладывает на
 * него, рядом с атрибутами потребителя. Подпись и её набор рисует шаблон.
 *
 * Пункт в группе берёт при сборке её ключ. Регистрирует элемент модуль меню, а
 * разметку, ожившую при регистрации, база собирает по месту: группу — раньше
 * пунктов её света.
 *
 * Разметка вынесена в menu-group.template.ts, жизненный цикл — в SoldyElement.
 */

import { MenuGroupDescriptor } from '@soldy-ui/setup'
import type { IItemGroup } from '@soldy-ui/core'
import { SoldyElement } from '../../../adapter'
import type { ISoldyElement, TSoldyElementProps } from '../../../adapter'
import { menuGroupTemplate } from './menu-group.template'
import { setupMenuGroup } from './setup.component'

export const TMenuGroupElement = SoldyElement(HTMLDivElement, {
	descriptor: MenuGroupDescriptor(),
	template: menuGroupTemplate,
	setup: setupMenuGroup,
})

/**
 * `<div is="so-menu-group">` из JS: нативный `div`, своё элемента soldy и
 * свойства пропов дескриптора (`label`) — без тех, что у `div` уже есть, и без
 * `HOST_PROPS` (`TSoldyElementProps`).
 */
export type TMenuGroupElementProps = HTMLDivElement &
	ISoldyElement<IItemGroup> &
	TSoldyElementProps<typeof MenuGroupDescriptor, HTMLDivElement>
