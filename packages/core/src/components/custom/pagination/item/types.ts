import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
} from '../../../base/value-control'
import type { IPaginationCollectionItemProps } from '../collection/types'
import type { TPaginationValue } from '../types'

export type TPaginationItemEvents = TValueControlEvents<TPaginationValue> & {
	/** change:text */
	'change:text': (value: string) => void
}

export interface IPaginationItemProps
	extends IValueControlProps<TPaginationValue>, IPaginationCollectionItemProps {
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
