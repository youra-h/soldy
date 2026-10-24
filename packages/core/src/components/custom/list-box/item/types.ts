import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
} from '../../../base/value-control'
import type { TChangeEvent, TValuePayload } from '../../../../common'
import type { IButton } from '../../button/types'
import type { TListItemContentFit } from '../../list'
import type { IListBoxCollectionItemProps } from '../collection/types'
import type { TListBoxView } from '../types'

export type TListBoxItemEvents = TValueControlEvents<string | number> & {
	/** change:text */
	'change:text': (payload: TValuePayload<string>) => void
	/** Запись своего `text` — подправить или отменить (`TChangeEvent`) */
	'change:text:before': (e: TChangeEvent<string>) => void
	/** change:contentFit */
	'change:contentFit': (value: TListItemContentFit | undefined) => void
	/** change:view */
	'change:view': (value: TListBoxView | undefined) => void
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
	 * Вид строки. Диктует его список: при добавлении элемента, на смену вида
	 * списка и поверх патча значение элемента перезаписывается, как `size` и
	 * `variant`.
	 */
	view?: TListBoxView
}

export interface IListBoxItem<
	TProps extends IListBoxItemProps = IListBoxItemProps,
	TEvents extends TListBoxItemEvents = TListBoxItemEvents,
> extends IValueControl<string | number, TProps, TEvents> {
	/** Текст элемента */
	text: string
	/** Что делать с не помещающимся текстом (`undefined` — как у списка) */
	contentFit: TListItemContentFit | undefined
	/** Вид строки — его пишет список */
	view: TListBoxView | undefined
	/**
	 * Строка элемента — кнопка, которой владеет элемент (`TItemRow`): роль и
	 * остановку Tab ей пишет набор `aria` элемента, а `size`, `variant`,
	 * `disabled` и `view` — элемент. Создаётся при первом чтении и дальше не
	 * меняется, событий `change:` у геттера нет.
	 */
	readonly row: IButton
}
