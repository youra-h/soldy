import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
	TValueControlStates,
} from '../../../base/value-control'
import type { IStateUnit, TValuePayload } from '../../../../common'
import type { IComponentOptions } from '../../../base/component'
import type { IListCollectionItemProps } from '../collection/types'

export type TListItemEvents = TValueControlEvents<string | number> & {
	/** change:text */
	'change:text': (payload: TValuePayload<string>) => void
	/** change:wordWrap */
	'change:wordWrap': (value: boolean) => void
}

export interface IListItemProps
	extends IValueControlProps<string | number>,
		IListCollectionItemProps {
	/** Текст элемента */
	text?: string
	/** Перенос текста (undefined = наследовать от TList) */
	wordWrap?: boolean
}

export type TListItemStates = TValueControlStates<string | number> & {
	text: IStateUnit<string>
}

export interface IListItem<
	TProps extends IListItemProps = IListItemProps,
	TEvents extends TListItemEvents = TListItemEvents,
	TStates extends TListItemStates = TListItemStates,
> extends IValueControl<string | number, TProps, TEvents, TStates> {
	/** Текст элемента */
	text: string
	/** Перенос текста (undefined = наследовать от TList) */
	wordWrap: boolean | undefined
}

export type TListItemOptions = IComponentOptions<TListItemStates>

