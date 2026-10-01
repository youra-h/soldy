import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
} from '../../../base/value-control'
import type { TChangeEvent, TValuePayload } from '../../../../common'
import type { IComponentOptions } from '../../../base/component'
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
}

export type TSelectItemOptions = IComponentOptions
