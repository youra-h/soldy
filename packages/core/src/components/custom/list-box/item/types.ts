import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
	TValueControlStates,
} from '../../../base/value-control'
import type { IStateUnit, TValuePayload } from '../../../../common'
import type { TListItemContentFit } from '../../list'
import type { IComponentOptions } from '../../../base/component'
import type { IListBoxCollectionItemProps } from '../collection/types'

export type TListBoxItemEvents = TValueControlEvents<string | number> & {
	/** change:text */
	'change:text': (payload: TValuePayload<string>) => void
	/** change:contentFit */
	'change:contentFit': (value: TListItemContentFit | undefined) => void
}

export interface IListBoxItemProps
	extends IValueControlProps<string | number>, IListBoxCollectionItemProps {
	/** Текст элемента */
	text?: string
	/**
	 * Что делать с не помещающимся текстом.
	 *
	 * Трёхзначен: `undefined` означает «как у списка», и это не то же самое,
	 * что `truncate`. `expand` элементу недоступен — ширина у списка одна на
	 * всех, и раздвинуть контейнер ради одной строки нельзя.
	 */
	contentFit?: TListItemContentFit
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
	/** Что делать с не помещающимся текстом (`undefined` — как у списка) */
	contentFit: TListItemContentFit | undefined
}

export type TListBoxItemOptions = IComponentOptions<TListBoxItemStates>
