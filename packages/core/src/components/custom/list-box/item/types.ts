import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
} from '../../../base/value-control'
import type { TChangeEvent, TValuePayload } from '../../../../common'
import type { TListItemContentFit } from '../../list'
import type { IListBoxCollectionItemProps } from '../collection/types'

export type TListBoxItemEvents = TValueControlEvents<string | number> & {
	/** change:text */
	'change:text': (payload: TValuePayload<string>) => void
	/** Запись своего `text` — подправить или отменить (`TChangeEvent`) */
	'change:text:before': (e: TChangeEvent<string>) => void
	/** change:contentFit */
	'change:contentFit': (value: TListItemContentFit | undefined) => void
	/** change:id — свой `id` строки */
	'change:id': (value: string | undefined) => void
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
	/**
	 * Свой `id` строки элемента. Не задан — у строки `id` от монтирования.
	 *
	 * Свой главнее: на `id` строки ссылается `aria-activedescendant` списка, и
	 * ссылка ведёт на тот `id`, что стоит в разметке.
	 */
	id?: string
}

export interface IListBoxItem<
	TProps extends IListBoxItemProps = IListBoxItemProps,
	TEvents extends TListBoxItemEvents = TListBoxItemEvents,
> extends IValueControl<string | number, TProps, TEvents> {
	/** Текст элемента */
	text: string
	/** Что делать с не помещающимся текстом (`undefined` — как у списка) */
	contentFit: TListItemContentFit | undefined
	/** Свой `id` строки; не задан — `undefined`, и у строки `id` от монтирования */
	id: string | undefined
}
