import { TItemGroup } from '../../../base/item-group'
import type { IItemGroupProps, TItemGroupEvents } from '../../../base/item-group'

/**
 * Группа пунктов меню под общей подписью (`Menu.Group`): «Вид», «Сортировка».
 *
 * Всё устройство группы — подпись, её набор (`labelAria`), `role="group"` и
 * имя от подписи — общее с группами списков и лежит в базе `TItemGroup`. Своё
 * у меню — блок CSS: подпись внутри `role="menu"` роли не несёт.
 *
 * Пропсы и карта событий — параметры: группа переключателей
 * (`TMenuRadioGroup`) — та же группа меню со своим значением.
 */
export class TMenuGroup<
	TProps extends IItemGroupProps = IItemGroupProps,
	TEvents extends TItemGroupEvents = TItemGroupEvents,
> extends TItemGroup<TProps, TEvents> {
	static override baseClass = 'so-menu-group'
}
