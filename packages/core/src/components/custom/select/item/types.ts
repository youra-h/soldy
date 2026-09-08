import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
	TValueControlStates,
} from '../../../base/value-control'
import type { IStateUnit, TValuePayload } from '../../../../common'
import type { IComponentOptions } from '../../../base/component'
import type { ISelectCollectionItemProps } from '../collection/types'

export type TSelectItemEvents = TValueControlEvents<string | number> & {
	/** change:text */
	'change:text': (payload: TValuePayload<string>) => void
}

export interface ISelectItemProps
	extends IValueControlProps<string | number>,
		ISelectCollectionItemProps {
	/** Текст опции — то, что видно в списке и попадает в поле после выбора */
	text?: string
}

export type TSelectItemStates = TValueControlStates<string | number> & {
	text: IStateUnit<string>
}

export interface ISelectItem<
	TProps extends ISelectItemProps = ISelectItemProps,
	TEvents extends TSelectItemEvents = TSelectItemEvents,
	TStates extends TSelectItemStates = TSelectItemStates,
> extends IValueControl<string | number, TProps, TEvents, TStates> {
	/** Текст опции */
	text: string
}

export type TSelectItemOptions = IComponentOptions<TSelectItemStates>
