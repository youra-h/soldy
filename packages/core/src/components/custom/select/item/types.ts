import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
} from '../../../base/value-control'
import type { TChangeEvent, TValuePayload } from '../../../../common'
import type { IButton } from '../../button/types'
import type { ISelectCollectionItemProps } from '../collection/types'

export type TSelectItemEvents = TValueControlEvents<string | number> & {
	/** change:text */
	'change:text': (payload: TValuePayload<string>) => void
	/** Запись своего `text` — подправить или отменить (`TChangeEvent`) */
	'change:text:before': (e: TChangeEvent<string>) => void
}

export interface ISelectItemProps
	extends IValueControlProps<string | number>, ISelectCollectionItemProps {
	/** Текст опции — то, что видно в списке и попадает в поле после выбора */
	text?: string
}

export interface ISelectItem<
	TProps extends ISelectItemProps = ISelectItemProps,
	TEvents extends TSelectItemEvents = TSelectItemEvents,
> extends IValueControl<string | number, TProps, TEvents> {
	/** Текст опции */
	text: string
	/**
	 * Строка опции — кнопка, которой владеет опция (`TItemRow`): роль и
	 * остановку Tab ей пишет набор `aria` опции, а `size`, `variant` и
	 * `disabled` — опция. Создаётся при первом чтении и дальше не меняется,
	 * событий `change:` у геттера нет.
	 */
	readonly row: IButton
}
