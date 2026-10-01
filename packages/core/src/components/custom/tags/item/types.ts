import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
} from '../../../base/value-control'
import type { TChangeEvent, TValuePayload, TAria, TAriaAttributes } from '../../../../common'
import type { IComponentOptions } from '../../../base/component'
import type { ITagsCollectionItemProps } from '../collection/types'

export type TTagsItemEvents = TValueControlEvents<string | number> & {
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
	/** change:closeAria — набор атрибутов кнопки закрытия изменился */
	'change:closeAria': (value: TAriaAttributes) => void
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

export interface ITagsItem<
	TProps extends ITagsItemProps = ITagsItemProps,
	TEvents extends TTagsItemEvents = TTagsItemEvents,
> extends IValueControl<string | number, TProps, TEvents> {
	/** Текст тега */
	text: string
	/** Можно ли закрыть тег (undefined = наследовать от родителя TTags) */
	closable?: boolean | undefined
	/** Слово для кнопки закрытия; к нему добавляется текст тега */
	closeLabel: string
	/**
	 * Атрибуты кнопки закрытия — живой набор, как `aria` строки: имя
	 * (`closeLabel` + текст тега) пишет тег, `tabindex` — коллекция
	 */
	readonly closeAria: TAria
}

export type TTagsItemOptions = IComponentOptions
