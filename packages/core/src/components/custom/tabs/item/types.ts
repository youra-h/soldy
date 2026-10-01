import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
} from '../../../base/value-control'
import type { TChangeEvent, TValuePayload, TAriaAttributes } from '../../../../common'
import type { ITabsCollectionItemProps } from '../collection/types'

// Параметр держит арность дженерика: аргумент передают на вызовах.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type TTabsItemEvents<TTab = any> = TValueControlEvents<string | number> & {
	/** change:text */
	'change:text': (payload: TValuePayload<string>) => void
	/** Запись своего `text` — подправить или отменить (`TChangeEvent`) */
	'change:text:before': (e: TChangeEvent<string>) => void
	/** change:closable */
	'change:closable': (value: boolean | undefined) => void
	/** Запись своего `closable` — подправить или отменить (`TChangeEvent`) */
	'change:closable:before': (e: TChangeEvent<boolean | undefined>) => void
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

export interface ITabsItem<
	TProps extends ITabsItemProps = ITabsItemProps,
	TEvents extends TTabsItemEvents<any> = TTabsItemEvents,
> extends IValueControl<string | number, TProps, TEvents> {
	/** Текст таба */
	text: string
	/** Можно ли закрыть таб (undefined = наследовать от родителя TTabs) */
	closable?: boolean | undefined
	/** Слово для кнопки закрытия; к нему добавляется текст таба */
	closeLabel: string
	/** Имя кнопки закрытия целиком: `closeLabel` + текст таба */
	readonly closeAria: TAriaAttributes
}
