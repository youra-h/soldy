import type { IMenuCollectionRadioItemProps } from '../collection/types'
import type { IMenuItem, IMenuItemProps, TMenuItemEvents } from '../item/types'
import type { IMenuRadioGroup } from '../radio-group/types'

export type TMenuRadioItemEvents = TMenuItemEvents & {
	/** change:group — переключатель перешёл в другую группу или вышел из неё */
	'change:group': (value: IMenuRadioGroup | null) => void
}

/**
 * Пропсы переключателя меню: пропсы пункта, отметка — выбор коллекции меню
 * (`selected`), как у флажка, — и группа, в которой отмечен один.
 */
export interface IMenuRadioItemProps extends IMenuItemProps, IMenuCollectionRadioItemProps {
	/**
	 * Группа переключателя; `null` — вне группы. В разметке её пишет проводка —
	 * ближайшая `Menu.RadioGroup` над пунктом, — из кода её передают сами
	 */
	group?: IMenuRadioGroup | null
}

/** Переключатель меню (`Menu.RadioItem`): пункт, который отмечается один в своей группе. */
export interface IMenuRadioItem extends IMenuItem<IMenuRadioItemProps, TMenuRadioItemEvents> {
	/** Группа переключателя; `null` — вне группы */
	group: IMenuRadioGroup | null
}
