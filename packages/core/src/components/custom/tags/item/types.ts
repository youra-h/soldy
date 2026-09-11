import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
	TValueControlStates,
} from '../../../base/value-control'
import type { IStateUnit, TValuePayload, TAriaAttributes } from '../../../../common'
import type { IComponentOptions } from '../../../base/component'
import type { ITagsCollectionItemProps } from '../collection/types'

export type TTagsItemEvents = TValueControlEvents<string | number> & {
	/** change:text */
	'change:text': (payload: TValuePayload<string>) => void
	/** change:closable */
	'change:closable': (value: boolean | undefined) => void
	/** change:closeLabel */
	'change:closeLabel': (value: string) => void
}

export interface ITagsItemProps
	extends IValueControlProps<string | number>, ITagsCollectionItemProps {
	/** Текст тега */
	text?: string
	/** Можно ли закрыть тег (undefined = наследовать от родителя TTags) */
	closable?: boolean
	/** Слово для кнопки закрытия; к нему добавляется текст тега */
	closeLabel?: string
}

export type TTagsItemStates = TValueControlStates<string | number> & {
	text: IStateUnit<string>
	closable: IStateUnit<boolean | undefined>
}

export interface ITagsItem<
	TProps extends ITagsItemProps = ITagsItemProps,
	TEvents extends TTagsItemEvents = TTagsItemEvents,
	TStates extends TTagsItemStates = TTagsItemStates,
> extends IValueControl<string | number, TProps, TEvents, TStates> {
	/** Текст тега */
	text: string
	/** Можно ли закрыть тег (undefined = наследовать от родителя TTags) */
	closable?: boolean | undefined
	/** Слово для кнопки закрытия; к нему добавляется текст тега */
	closeLabel: string
	/** Имя кнопки закрытия целиком: `closeLabel` + текст тега */
	readonly closeAria: TAriaAttributes
}

export type TTagsItemOptions = IComponentOptions<TTagsItemStates>
