import { TItemGroup } from '../../../base/item-group'
import type { IItemGroupProps } from '../../../base/item-group'

/**
 * Группа опций в списке панели Select (`Select.Group`): «Фрукты», «Овощи».
 *
 * Всё устройство группы — подпись, её набор (`labelAria`), `role="group"` и
 * имя от подписи — общее с группами меню и ListBox и лежит в базе
 * `TItemGroup`. Своё у Select — блок CSS и роль подписи: список панели —
 * `listbox`, а в нём ARIA пускает только опции и группы, поэтому подпись —
 * `presentation` с `id`, на который ссылается группа (APG «Listbox with
 * grouped options»), как у группы ListBox.
 */
export class TSelectGroup extends TItemGroup {
	static override baseClass = 'so-select-group'

	constructor(props: Partial<IItemGroupProps> = {}) {
		super(props)

		this._labelAria.add('role', 'presentation')
	}
}
