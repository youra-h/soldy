import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
} from '../../../base/value-control'
import type {
	ITranslatable,
	TChangeEvent,
	TValuePayload,
	TAria,
	TAriaAttributes,
	TTranslatableEvents,
} from '../../../../common'
import type { ITagsCollectionItemProps } from '../collection/types'

export type TTagsItemEvents = TValueControlEvents<string | number> &
	TTranslatableEvents & {
		/** change:text */
		'change:text': (payload: TValuePayload<string>) => void
		/** Запись своего `text` — подправить или отменить (`TChangeEvent`) */
		'change:text:before': (e: TChangeEvent<string>) => void
		/** change:closable */
		'change:closable': (value: boolean | undefined) => void
		/** Запись своего `closable` — подправить или отменить (`TChangeEvent`) */
		'change:closable:before': (e: TChangeEvent<boolean | undefined>) => void
		/** change:closeAria — набор атрибутов кнопки закрытия изменился */
		'change:closeAria': (value: TAriaAttributes) => void
	}

export interface ITagsItemProps
	extends IValueControlProps<string | number>, ITagsCollectionItemProps {
	/** Текст тега */
	text?: string
	/** Можно ли закрыть тег (undefined = наследовать от родителя TTags) */
	closable?: boolean
}

export interface ITagsItem<
	TProps extends ITagsItemProps = ITagsItemProps,
	TEvents extends TTagsItemEvents = TTagsItemEvents,
>
	extends IValueControl<string | number, TProps, TEvents>, ITranslatable {
	/** Текст тега */
	text: string
	/** Можно ли закрыть тег (undefined = наследовать от родителя TTags) */
	closable?: boolean | undefined
	/**
	 * Атрибуты кнопки закрытия — живой набор, как `aria` строки: имя (строка
	 * словаря, раздел `tags`, с текстом тега) пишет тег, `tabindex` — коллекция
	 */
	readonly closeAria: TAria
}
