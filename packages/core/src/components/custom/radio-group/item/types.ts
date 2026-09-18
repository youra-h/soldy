import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
	TValueControlStates,
} from '../../../base/value-control'
import type { IComponentOptions } from '../../../base/component'
import type { IRadioGroupCollectionItemProps } from '../collection/types'
import type { TRadioGroupView } from '../types'

export type TRadioGroupItemEvents = TValueControlEvents<string | number> & {
	/** change:view */
	'change:view': (value: TRadioGroupView | undefined) => void
}

export interface IRadioGroupItemProps
	extends IValueControlProps<string | number>, IRadioGroupCollectionItemProps {
	/**
	 * Вид радио. Раздаёт его группа: при добавлении радио и при смене вида
	 * группы значение элемента перезаписывается, как `size` и `variant`.
	 */
	view?: TRadioGroupView
}

export type TRadioGroupItemStates = TValueControlStates<string | number>

export interface IRadioGroupItem extends IValueControl<
	string | number,
	IRadioGroupItemProps,
	TRadioGroupItemEvents,
	TRadioGroupItemStates
> {
	/** Вид радио */
	view: TRadioGroupView | undefined
}

export type TRadioGroupItemOptions = IComponentOptions<TRadioGroupItemStates>
