import TMenuItem from '../item/item.class'
import type { TDefaultValues } from '../../../base/component'
import type { IMenuRadioGroup } from '../radio-group/types'
import type { IMenuRadioItem, IMenuRadioItemProps, TMenuRadioItemEvents } from './types'

/**
 * Переключатель меню (`Menu.RadioItem`): «по имени», «по дате» в группе
 * «Сортировка».
 *
 * Наследник пункта, как флажок: фабрика коллекции меню строит пункты класса
 * `TMenuItem`, и всё, что не его экземпляр, сочла бы сырым источником.
 *
 * Отметка — выбор коллекции меню (режим `multiple`), как у флажка, а не своё
 * состояние переключателя: `aria-checked` пишет `TMenuExtension`, отметку
 * разметка рисует по `selected` фасада элемента. Что в группе отмечен один и
 * что значение группы идёт за отметкой, держит то же расширение: своего
 * правила у переключателя нет. Нажатие отмечает его (`checkItem`) и меню не
 * закрывает; отмеченный нажатием не снимается.
 *
 * Своё у переключателя — роль, признак `checkable` и группа (`group`). Группу
 * в разметке пишет проводка — ближайшая `Menu.RadioGroup` над пунктом, — из
 * кода её передают сами. Без группы переключатель отмечается сам по себе.
 */
export default class TMenuRadioItem
	extends TMenuItem<IMenuRadioItemProps, TMenuRadioItemEvents>
	implements IMenuRadioItem
{
	static defaultValues: typeof TMenuItem.defaultValues &
		TDefaultValues<IMenuRadioItemProps, 'group'> = {
		...TMenuItem.defaultValues,
		group: null,
	}

	protected _group: IMenuRadioGroup | null

	constructor(props: Partial<IMenuRadioItemProps> = {}) {
		super(props)

		const ctor = new.target as typeof TMenuRadioItem

		this._group = props.group ?? ctor.defaultValues.group
	}

	protected override get _role(): string {
		return 'menuitemradio'
	}

	override get checkable(): boolean {
		return true
	}

	/** Группа переключателя; `null` — вне группы. */
	get group(): IMenuRadioGroup | null {
		return this._group
	}

	set group(value: IMenuRadioGroup | null) {
		if (this._group === value) return

		this._group = value
		this.events.emit('change:group', value)
	}

	override getProps(): IMenuRadioItemProps {
		return {
			...super.getProps(),
			group: this._group,
		}
	}
}

/** Переключатель ли это меню. */
export function isMenuRadioItem(value: unknown): value is IMenuRadioItem {
	return value instanceof TMenuRadioItem
}
