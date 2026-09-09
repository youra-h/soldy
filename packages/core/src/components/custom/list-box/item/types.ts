import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
	TValueControlStates,
} from '../../../base/value-control'
import type { IStateUnit, TValuePayload } from '../../../../common'
import type { IComponentOptions } from '../../../base/component'
import type { IListBoxCollectionItemProps } from '../collection/types'

export type TListBoxItemEvents = TValueControlEvents<string | number> & {
	/** change:text */
	'change:text': (payload: TValuePayload<string>) => void
	/** change:wordWrap */
	'change:wordWrap': (value: boolean) => void
}

export interface IListBoxItemProps
	extends IValueControlProps<string | number>, IListBoxCollectionItemProps {
	/** Текст элемента */
	text?: string
	/** Перенос текста (`undefined` — наследовать от списка) */
	wordWrap?: boolean
}

export type TListBoxItemStates = TValueControlStates<string | number> & {
	text: IStateUnit<string>
}

export interface IListBoxItem<
	TProps extends IListBoxItemProps = IListBoxItemProps,
	TEvents extends TListBoxItemEvents = TListBoxItemEvents,
	TStates extends TListBoxItemStates = TListBoxItemStates,
> extends IValueControl<string | number, TProps, TEvents, TStates> {
	/** Текст элемента */
	text: string
	/** Перенос текста (`undefined` — наследовать от списка) */
	wordWrap: boolean | undefined
}

export type TListBoxItemOptions = IComponentOptions<TListBoxItemStates>
