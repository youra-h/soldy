import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
} from '../../../base/value-control'
import type { TChangeEvent, TValuePayload } from '../../../../common'
import type { ISelectCollectionItemProps } from '../collection/types'

export type TSelectItemEvents = TValueControlEvents<string | number> & {
	/** change:text */
	'change:text': (payload: TValuePayload<string>) => void
	/** Запись своего `text` — подправить или отменить (`TChangeEvent`) */
	'change:text:before': (e: TChangeEvent<string>) => void
	/** change:id — свой `id` строки опции */
	'change:id': (value: string | undefined) => void
}

export interface ISelectItemProps
	extends IValueControlProps<string | number>, ISelectCollectionItemProps {
	/** Текст опции — то, что видно в списке и попадает в поле после выбора */
	text?: string
	/**
	 * Свой `id` строки опции. Не задан — у строки `id` от монтирования.
	 *
	 * Свой главнее: на `id` строки ссылается `aria-activedescendant` поля, и
	 * ссылка ведёт на тот `id`, что стоит в разметке.
	 */
	id?: string
}

export interface ISelectItem<
	TProps extends ISelectItemProps = ISelectItemProps,
	TEvents extends TSelectItemEvents = TSelectItemEvents,
> extends IValueControl<string | number, TProps, TEvents> {
	/** Текст опции */
	text: string
	/** Свой `id` строки; не задан — `undefined`, и у строки `id` от монтирования */
	id: string | undefined
}
