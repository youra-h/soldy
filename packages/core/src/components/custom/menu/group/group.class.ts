import { TItemGroup } from '../../../base/item-group'

/**
 * Группа пунктов меню под общей подписью (`Menu.Group`): «Вид», «Сортировка».
 *
 * Всё устройство группы — подпись, её набор (`labelAria`), `role="group"` и
 * имя от подписи — общее с группами списков и лежит в базе `TItemGroup`. Своё
 * у меню — блок CSS: подпись внутри `role="menu"` роли не несёт.
 */
export class TMenuGroup extends TItemGroup {
	static override baseClass = 'so-menu-group'
}
