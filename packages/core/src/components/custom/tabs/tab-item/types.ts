import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
	TValueControlStates,
} from '../../../base/value-control'
import type { IStateUnit, TValuePayload } from '../../../../common'
import type { IComponentOptions } from '../../../base/component'
import type { ITabsCollectionItemProps } from '../collection/types'

export type TTabItemEvents<TTab = any> = TValueControlEvents<string | number> & {
	/** change:text */
	'change:text': (payload: TValuePayload<string>) => void
	/** change:closable */
	'change:closable': (value: boolean | undefined) => void
}

export interface ITabItemProps
	extends IValueControlProps<string | number>,
		ITabsCollectionItemProps {
	/** Текст таба */
	text?: string
	/** Можно ли закрыть таб (undefined = наследовать от родителя TTabs) */
	closable?: boolean
}

export type TTabItemStates = TValueControlStates<string | number> & {
	text: IStateUnit<string>
	closable: IStateUnit<boolean | undefined>
}

export interface ITabItem<
	TProps extends ITabItemProps = ITabItemProps,
	TEvents extends TTabItemEvents<any> = TTabItemEvents,
	TStates extends TTabItemStates = TTabItemStates,
> extends IValueControl<string | number, TProps, TEvents, TStates> {
	/** Текст таба */
	text: string
	/** Можно ли закрыть таб (undefined = наследовать от родителя TTabs) */
	closable?: boolean | undefined
}

export type TTabItemOptions = IComponentOptions<TTabItemStates>
