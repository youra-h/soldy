import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
} from '../../../base/value-control'
import type { TPaginationValue } from '../types'

export type TPaginationItemEvents = TValueControlEvents<TPaginationValue> & {
	/** change:text */
	'change:text': (value: string) => void
}

/**
 * Пропсы страницы. Коллекционных (`active`) среди них нет, как у дня
 * календаря: текущую страницу ставит не разметка и не данные, а значение
 * пагинации.
 */
export interface IPaginationItemProps extends IValueControlProps<TPaginationValue> {
	/** Текст страницы: номер в цифрах локали или текст страницы из `pages` */
	text?: string
}

export interface IPaginationItem extends IValueControl<
	TPaginationValue,
	IPaginationItemProps,
	TPaginationItemEvents
> {
	/** Текст страницы */
	text: string
}
