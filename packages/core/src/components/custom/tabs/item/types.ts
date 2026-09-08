import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
	TValueControlStates,
} from '../../../base/value-control'
import type { IStateUnit, TValuePayload, TAriaAttributes } from '../../../../common'
import type { IComponentOptions } from '../../../base/component'
import type { ITabsCollectionItemProps } from '../collection/types'

export type TTabsItemEvents<TTab = any> = TValueControlEvents<string | number> & {
	/** change:text */
	'change:text': (payload: TValuePayload<string>) => void
	/** change:closable */
	'change:closable': (value: boolean | undefined) => void
	/** change:closeLabel */
	'change:closeLabel': (value: string) => void
}

export interface ITabsItemProps
	extends IValueControlProps<string | number>, ITabsCollectionItemProps {
	/** Текст таба */
	text?: string
	/** Можно ли закрыть таб (undefined = наследовать от родителя TTabs) */
	closable?: boolean
	/** Слово для кнопки закрытия; к нему добавляется текст таба */
	closeLabel?: string
}

export type TTabsItemStates = TValueControlStates<string | number> & {
	text: IStateUnit<string>
	closable: IStateUnit<boolean | undefined>
}

export interface ITabsItem<
	TProps extends ITabsItemProps = ITabsItemProps,
	TEvents extends TTabsItemEvents<any> = TTabsItemEvents,
	TStates extends TTabsItemStates = TTabsItemStates,
> extends IValueControl<string | number, TProps, TEvents, TStates> {
	/** Текст таба */
	text: string
	/** Можно ли закрыть таб (undefined = наследовать от родителя TTabs) */
	closable?: boolean | undefined
	/** Слово для кнопки закрытия; к нему добавляется текст таба */
	closeLabel: string
	/** Имя кнопки закрытия целиком: `closeLabel` + текст таба */
	readonly closeAria: TAriaAttributes
}

export type TTabsItemOptions = IComponentOptions<TTabsItemStates>
