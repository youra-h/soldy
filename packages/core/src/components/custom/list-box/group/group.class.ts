import { TItemGroup } from '../../../base/item-group'
import type { IItemGroupProps } from '../../../base/item-group'

/**
 * Группа элементов списка под общей подписью (`ListBox.Group`): «Фрукты»,
 * «Овощи».
 *
 * Всё устройство группы — подпись, её набор (`labelAria`), `role="group"` и
 * имя от подписи — общее с группами меню и Select и лежит в базе
 * `TItemGroup`. Своё у списка — блок CSS и роль подписи: в `listbox` ARIA
 * пускает только опции и группы, поэтому подпись — `presentation` с `id`, на
 * который ссылается группа (APG «Listbox with grouped options»). Иначе узел
 * подписи без роли стоял бы среди опций, и проверка
 * `aria-required-children` списка не прошла бы.
 */
export class TListBoxGroup extends TItemGroup {
	static override baseClass = 'so-list-box-group'

	constructor(props: Partial<IItemGroupProps> = {}) {
		super(props)

		this._labelAria.add('role', 'presentation')
	}
}
