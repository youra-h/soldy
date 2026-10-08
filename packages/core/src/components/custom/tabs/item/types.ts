import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
} from '../../../base/value-control'
import type {
	ITranslatable,
	TChangeEvent,
	TValuePayload,
	TAriaAttributes,
	TTranslatableEvents,
} from '../../../../common'
import type { ITabsCollectionItemProps } from '../collection/types'

// Параметр держит арность дженерика: аргумент передают на вызовах.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type TTabsItemEvents<TTab = any> = TValueControlEvents<string | number> &
	TTranslatableEvents & {
		/** change:text */
		'change:text': (payload: TValuePayload<string>) => void
		/** Запись своего `text` — подправить или отменить (`TChangeEvent`) */
		'change:text:before': (e: TChangeEvent<string>) => void
		/** change:closable */
		'change:closable': (value: boolean | undefined) => void
		/** Запись своего `closable` — подправить или отменить (`TChangeEvent`) */
		'change:closable:before': (e: TChangeEvent<boolean | undefined>) => void
	}

export interface ITabsItemProps
	extends IValueControlProps<string | number>, ITabsCollectionItemProps {
	/** Текст таба */
	text?: string
	/** Можно ли закрыть таб (undefined = наследовать от родителя TTabs) */
	closable?: boolean
}

export interface ITabsItem<
	TProps extends ITabsItemProps = ITabsItemProps,
	TEvents extends TTabsItemEvents<any> = TTabsItemEvents,
>
	extends IValueControl<string | number, TProps, TEvents>, ITranslatable {
	/** Текст таба */
	text: string
	/** Можно ли закрыть таб (undefined = наследовать от родителя TTabs) */
	closable?: boolean | undefined
	/** Имя кнопки закрытия целиком: строка словаря (раздел `tabs`) с текстом таба */
	readonly closeAria: TAriaAttributes
}
