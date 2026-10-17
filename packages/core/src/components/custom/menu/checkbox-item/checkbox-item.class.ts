import TMenuItem from '../item/item.class'
import type { IMenuCheckboxItem, IMenuCheckboxItemProps } from './types'

/**
 * Флажок меню (`Menu.CheckboxItem`): «Показывать сетку», «Жирный».
 *
 * Наследник пункта, а не режим: фабрика коллекции меню строит пункты класса
 * `TMenuItem`, и всё, что не его экземпляр, сочла бы сырым источником —
 * флажок разметки стал бы новым пунктом-действием.
 *
 * Отметка — выбор коллекции меню (режим `multiple`), а не своё состояние
 * флажка: `aria-checked` пишет `TMenuExtension`, отметку разметка рисует по
 * `selected` фасада элемента. Своего у флажка — только роль и признак
 * `checkable`: нажатие переключает отметку и меню не закрывает.
 */
export default class TMenuCheckboxItem
	extends TMenuItem<IMenuCheckboxItemProps>
	implements IMenuCheckboxItem
{
	protected override get _role(): string {
		return 'menuitemcheckbox'
	}

	override get checkable(): boolean {
		return true
	}
}
